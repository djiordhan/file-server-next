import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, access, appendFile, readFile, unlink, rename, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { NAS_CONFIG, StorageUtils } from '../../config/nas';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const uploadPath = formData.get('path') as string || '/';
    const chunkIndex = formData.get('chunkIndex');
    const totalChunks = formData.get('totalChunks');
    const fileName = formData.get('fileName');
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    console.log(`Upload request: ${files.length} files to path: ${uploadPath}`);
    
    // Check if this is a chunked upload
    const isChunkedUpload = chunkIndex !== null && totalChunks !== null && fileName !== null;
    
    if (isChunkedUpload) {
      console.log(`Chunked upload: chunk ${chunkIndex}/${totalChunks} for file: ${fileName}`);
      return await handleChunkedUpload(files[0], uploadPath, parseInt(chunkIndex as string), parseInt(totalChunks as string), fileName as string);
    }

    // Validate upload path
    const sanitizedPath = uploadPath.replace(/\.\./g, '').replace(/\/+/g, '/');
    const fullUploadPath = join(NAS_CONFIG.STORAGE_PATH, sanitizedPath);
    
    console.log(`Full upload path: ${fullUploadPath}`);
    console.log(`Storage base path: ${NAS_CONFIG.STORAGE_PATH}`);
    
    // Check if storage directory exists and is accessible
    try {
      await access(NAS_CONFIG.STORAGE_PATH);
      console.log('Storage directory is accessible');
    } catch (error) {
      console.error('Storage directory is not accessible:', error);
      return NextResponse.json(
        { error: `Storage directory ${NAS_CONFIG.STORAGE_PATH} is not accessible` },
        { status: 500 }
      );
    }
    
    // Create directory if it doesn't exist
    try {
      await mkdir(fullUploadPath, { recursive: true });
      console.log(`Created/verified upload directory: ${fullUploadPath}`);
    } catch (error) {
      console.error('Error creating directory:', error);
      return NextResponse.json(
        { error: 'Failed to create upload directory' },
        { status: 500 }
      );
    }

    const uploadedFiles = [];

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name} (${file.size} bytes)`);
        
        // Generate unique filename to prevent conflicts
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileExtension = file.name.split('.').pop();
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const uniqueFileName = `${baseName}_${timestamp}_${randomSuffix}.${fileExtension}`;
        
        const filePath = join(fullUploadPath, uniqueFileName);
        console.log(`File will be saved to: ${filePath}`);
        
        // Convert File to Buffer and write to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        await writeFile(filePath, buffer);
        console.log(`Successfully wrote file: ${filePath}`);
        
        uploadedFiles.push({
          id: `${timestamp}_${randomSuffix}`,
          name: file.name,
          originalName: file.name,
          size: file.size,
          type: file.type,
          path: `${sanitizedPath}/${uniqueFileName}`,
          uploadedAt: new Date().toISOString(),
          sizeFormatted: StorageUtils.formatSize(file.size)
        });
        
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        return NextResponse.json(
          { error: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    console.log(`Successfully uploaded ${uploadedFiles.length} files`);

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      files: uploadedFiles,
      uploadPath: sanitizedPath
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error during upload' },
      { status: 500 }
    );
  }
}

async function handleChunkedUpload(
  chunk: File,
  uploadPath: string,
  chunkIndex: number,
  totalChunks: number,
  fileName: string
): Promise<NextResponse> {
  try {
    // Validate chunk parameters
    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      return NextResponse.json(
        { error: `Invalid chunk index: ${chunkIndex} (must be 0-${totalChunks - 1})` },
        { status: 400 }
      );
    }
    
    if (totalChunks <= 0) {
      return NextResponse.json(
        { error: `Invalid total chunks: ${totalChunks}` },
        { status: 400 }
      );
    }
    
    if (!fileName || fileName.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid filename provided' },
        { status: 400 }
      );
    }
    
    const sanitizedPath = uploadPath.replace(/\.\./g, '').replace(/\/+/g, '/');
    const fullUploadPath = join(NAS_CONFIG.STORAGE_PATH, sanitizedPath);
    
    // Create directory if it doesn't exist
    await mkdir(fullUploadPath, { recursive: true });
    
    // Create a temporary file path for this chunked upload
    // Use a hash of the filename to avoid conflicts with multiple simultaneous uploads
    const fileHash = Buffer.from(fileName).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    const tempFileName = `temp_${fileHash}_${Date.now()}`;
    const tempFilePath = join(fullUploadPath, tempFileName);
    
    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} for file: ${fileName}`);
    console.log(`Temp file path: ${tempFilePath}`);
    
    // Convert chunk to buffer
    const bytes = await chunk.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    if (chunkIndex === 0) {
      // First chunk - create new file
      await writeFile(tempFilePath, buffer);
      console.log(`Created temp file for chunked upload: ${tempFilePath}`);
    } else {
      // Subsequent chunks - append to existing file
      await appendFile(tempFilePath, buffer);
      console.log(`Appended chunk ${chunkIndex} to temp file: ${tempFilePath}`);
    }
    
    // Check if this is the last chunk
    if (chunkIndex === totalChunks - 1) {
      // Final chunk - rename temp file to final filename
      const finalFileName = fileName;
      
      // Check if file already exists and generate unique name if needed
      let uniqueFileName = finalFileName;
      let counter = 1;
      while (await existsSync(join(fullUploadPath, uniqueFileName))) {
        const nameParts = finalFileName.split('.');
        const extension = nameParts.pop();
        const baseName = nameParts.join('.');
        uniqueFileName = `${baseName}_${counter}.${extension}`;
        counter++;
      }
      
      const finalUniquePath = join(fullUploadPath, uniqueFileName);
      
             // Try to rename temp file to final filename (more efficient than copy + delete)
       try {
         await rename(tempFilePath, finalUniquePath);
         console.log(`Renamed temp file to final file: ${uniqueFileName}`);
         // Get file size after rename
         const stats = await stat(finalUniquePath);
         const finalFileSize = stats.size;
         
         console.log(`Completed chunked upload: ${uniqueFileName} (${finalFileSize} bytes)`);
         
         return NextResponse.json({
           success: true,
           message: 'Chunked upload completed successfully',
           files: [{
             id: `chunked_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
             name: uniqueFileName,
             originalName: fileName,
             size: finalFileSize,
             type: chunk.type,
             path: `${sanitizedPath}/${uniqueFileName}`,
             uploadedAt: new Date().toISOString(),
             sizeFormatted: StorageUtils.formatSize(finalFileSize)
           }],
           uploadPath: sanitizedPath,
           completed: true
         });
       } catch (error) {
         // If rename fails, fall back to copy + delete
         console.warn('Rename failed, falling back to copy + delete:', error);
         const completeFileBuffer = await readFile(tempFilePath);
         await writeFile(finalUniquePath, completeFileBuffer);
         
         // Clean up temp file
         try {
           await unlink(tempFilePath);
           console.log(`Cleaned up temp file: ${tempFilePath}`);
         } catch (cleanupError) {
           console.warn('Could not delete temp file:', cleanupError);
         }
         
         console.log(`Completed chunked upload: ${uniqueFileName} (${completeFileBuffer.length} bytes)`);
         
         return NextResponse.json({
           success: true,
           message: 'Chunked upload completed successfully',
           files: [{
             id: `chunked_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
             name: uniqueFileName,
             originalName: fileName,
             size: completeFileBuffer.length,
             type: chunk.type,
             path: `${sanitizedPath}/${uniqueFileName}`,
             uploadedAt: new Date().toISOString(),
             sizeFormatted: StorageUtils.formatSize(completeFileBuffer.length)
           }],
           uploadPath: sanitizedPath,
           completed: true
                  });
       }
    } else {
      // Not the final chunk
      return NextResponse.json({
        success: true,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
        chunkIndex,
        totalChunks,
        completed: false
      });
    }
    
  } catch (error) {
    console.error('Error handling chunked upload:', error);
    return NextResponse.json(
      { error: `Failed to upload chunk ${chunkIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check if storage directory exists
    let storageAccessible = false;
    try {
      await access(NAS_CONFIG.STORAGE_PATH);
      storageAccessible = true;
    } catch (error) {
      console.error('Storage directory not accessible:', error);
    }

    return NextResponse.json({
      message: 'Upload endpoint is working',
      config: {
        storagePath: NAS_CONFIG.STORAGE_PATH,
        maxFileSize: NAS_CONFIG.MAX_FILE_SIZE,
        maxTotalUploads: NAS_CONFIG.MAX_TOTAL_UPLOADS,
        maxFilesCount: NAS_CONFIG.MAX_FILES_COUNT
      },
      status: {
        storageAccessible,
        storagePath: NAS_CONFIG.STORAGE_PATH
      }
    });
  } catch (error) {
    console.error('Error in GET /api/upload:', error);
    return NextResponse.json(
      { error: 'Failed to get upload status' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('Manual cleanup endpoint called - no cleanup function available');
    return NextResponse.json({
      success: true,
      message: 'Cleanup endpoint available but no cleanup function implemented'
    });
  } catch (error) {
    console.error('Error in cleanup endpoint:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
