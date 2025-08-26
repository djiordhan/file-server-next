import { NAS_CONFIG, StorageUtils } from '../config/nas';

export interface UploadProgress {
  fileIndex: number;
  fileName: string;
  progress: number;
  uploaded: number;
  total: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadResult {
  success: boolean;
  files: any[];
  message: string;
  uploadPath: string;
}

export class FileUploader {
  private static CHUNK_SIZE = Math.max(1024 * 1024, StorageUtils.parseSize(NAS_CONFIG.CHUNK_SIZE)); // Minimum 1MB chunks

  static async uploadFiles(
    files: File[],
    uploadPath: string,
    onProgress: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const results: any[] = [];
    let hasError = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Initialize progress
      onProgress({
        fileIndex: i,
        fileName: file.name,
        progress: 0,
        uploaded: 0,
        total: file.size,
        status: 'pending'
      });

      try {
        // Update status to uploading
        onProgress({
          fileIndex: i,
          fileName: file.name,
          progress: 0,
          uploaded: 0,
          total: file.size,
          status: 'uploading'
        });

        if (file.size > this.CHUNK_SIZE) {
          // Large file - use chunked upload
          console.log(`File ${file.name} (${file.size} bytes) exceeds chunk size (${this.CHUNK_SIZE} bytes), using chunked upload`);
          const chunkResult = await this.uploadLargeFile(file, uploadPath, i, onProgress);
          if (chunkResult) {
            results.push(chunkResult);
          }
        } else {
          // Small file - upload directly
          const uploadResult = await this.uploadSmallFile(file, uploadPath, i, onProgress);
          if (uploadResult) {
            results.push(uploadResult);
          }
        }

        // Mark as completed
        onProgress({
          fileIndex: i,
          fileName: file.name,
          progress: 100,
          uploaded: file.size,
          total: file.size,
          status: 'completed'
        });

      } catch (error) {
        hasError = true;
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        
        onProgress({
          fileIndex: i,
          fileName: file.name,
          progress: 0,
          uploaded: 0,
          total: file.size,
          status: 'error',
          error: errorMessage
        });

        console.error(`Error uploading ${file.name}:`, error);
      }
    }

    if (hasError) {
      throw new Error('Some files failed to upload');
    }

    return {
      success: true,
      files: results,
      message: `Successfully uploaded ${files.length} file(s)`,
      uploadPath
    };
  }

  private static async uploadSmallFile(
    file: File,
    uploadPath: string,
    fileIndex: number,
    onProgress: (progress: UploadProgress) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('path', uploadPath);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress({
            fileIndex,
            fileName: file.name,
            progress,
            uploaded: event.loaded,
            total: event.total,
            status: 'uploading'
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.files && response.files.length > 0) {
              // Return the uploaded file info from the API response
              resolve(response.files[0]);
            } else {
              reject(new Error(response.error || 'Upload failed'));
            }
          } catch (error) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'));
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  }

  private static async uploadLargeFile(
    file: File,
    uploadPath: string,
    fileIndex: number,
    onProgress: (progress: UploadProgress) => void
  ): Promise<any> {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    let uploadedChunks = 0;
    
    console.log(`Starting chunked upload for ${file.name}: ${totalChunks} chunks of ${this.CHUNK_SIZE} bytes each`);
    
    // Track failed chunks for potential retry
    const failedChunks: number[] = [];
    const maxRetries = 3;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('files', chunk);
      formData.append('path', uploadPath);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('fileName', file.name);

      let retryCount = 0;
      let chunkSuccess = false;

      while (retryCount < maxRetries && !chunkSuccess) {
        try {
          if (retryCount > 0) {
            console.log(`Retrying chunk ${chunkIndex + 1} (attempt ${retryCount + 1}/${maxRetries})`);
          }

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          
          if (result.success) {
            uploadedChunks++;
            chunkSuccess = true;
            
            // Update progress based on chunks uploaded
            const progress = (uploadedChunks / totalChunks) * 100;
            const uploaded = Math.floor((uploadedChunks / totalChunks) * file.size);

            onProgress({
              fileIndex,
              fileName: file.name,
              progress,
              uploaded,
              total: file.size,
              status: 'uploading'
            });

            // Check if this was the final chunk
            if (result.completed && result.files && result.files.length > 0) {
              console.log(`Chunked upload completed for ${file.name}`);
              return result.files[0];
            }
          } else {
            throw new Error(result.error || 'Chunk upload failed');
          }

        } catch (error) {
          retryCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (retryCount >= maxRetries) {
            console.error(`Chunk ${chunkIndex + 1} failed after ${maxRetries} attempts:`, errorMessage);
            failedChunks.push(chunkIndex);
            throw new Error(`Chunk ${chunkIndex + 1} failed after ${maxRetries} attempts: ${errorMessage}`);
          } else {
            console.warn(`Chunk ${chunkIndex + 1} failed (attempt ${retryCount}/${maxRetries}):`, errorMessage);
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
    }

    // If we get here, something went wrong
    if (failedChunks.length > 0) {
      throw new Error(`Failed to upload chunks: ${failedChunks.join(', ')}`);
    }

    // Fallback return if something goes wrong
    return {
      id: `chunked_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: file.name,
      originalName: file.name,
      size: file.size,
      type: file.type,
      path: `${uploadPath}/${file.name}`,
      uploadedAt: new Date().toISOString(),
      sizeFormatted: this.formatFileSize(file.size)
    };
  }

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async getUploadConfig(): Promise<any> {
    try {
      const response = await fetch('/api/upload');
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('Failed to get upload config:', error);
      return null;
    }
  }
}
