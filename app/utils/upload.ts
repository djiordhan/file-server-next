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

        console.log(`Uploading file ${file.name} (${file.size} bytes) with Next.js FormData`);
        
        // Upload file using Next.js built-in FormData (no more manual chunking needed!)
        const uploadResult = await this.uploadFile(file, uploadPath, i, onProgress);
        if (uploadResult) {
          results.push(uploadResult);
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

  private static async uploadFile(
    file: File,
    uploadPath: string,
    fileIndex: number,
    onProgress: (progress: UploadProgress) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('files', file);
    
    // Add upload path as query parameter since Formidable expects it there
    const uploadUrl = `/api/upload?path=${encodeURIComponent(uploadPath)}`;

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
              // Find the file that matches our upload
              const uploadedFile = response.files.find((f: any) => 
                f.originalName === file.name || f.name.includes(file.name.split('.')[0])
              );
              resolve(uploadedFile || response.files[0]);
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

      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
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
