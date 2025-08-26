import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, access, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { NAS_CONFIG, StorageUtils } from '../../config/nas';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting file upload with Next.js FormData...');
    
    // Get the upload path from query parameters
    const url = new URL(request.url);
    const uploadPath = url.searchParams.get('path') || '/';
    
    console.log(`Upload path: ${uploadPath}`);
    
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
    
    // Parse the multipart form data using Next.js built-in FormData
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    console.log(`Processing ${files.length} files...`);
    
    const uploadedFiles = [];
    
    // Process uploaded files
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name} (${file.size} bytes)`);
        
        // Generate unique filename to prevent conflicts
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileExtension = file.name.split('.').pop() || '';
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const uniqueFileName = `${baseName}_${timestamp}_${randomSuffix}.${fileExtension}`;
        
        const finalFilePath = join(fullUploadPath, uniqueFileName);
        console.log(`File will be saved to: ${finalFilePath}`);
        
        // Convert File to Buffer and write to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        await writeFile(finalFilePath, buffer);
        console.log(`Successfully wrote file: ${finalFilePath}`);
        
        uploadedFiles.push({
          id: `${timestamp}_${randomSuffix}`,
          name: uniqueFileName,
          originalName: file.name,
          size: file.size,
          type: file.type,
          path: `${sanitizedPath}/${uniqueFileName}`,
          uploadedAt: new Date().toISOString(),
          sizeFormatted: StorageUtils.formatSize(file.size)
        });
        
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        return NextResponse.json(
          { error: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}` },
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
      message: 'Upload endpoint is working with Next.js FormData',
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
    console.log('Manual cleanup requested');
    
    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully'
    });
  } catch (error) {
    console.error('Error in cleanup endpoint:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
