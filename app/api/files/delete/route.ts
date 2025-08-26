import { NextRequest, NextResponse } from 'next/server';
import { unlink, access } from 'fs/promises';
import { join } from 'path';
import { NAS_CONFIG } from '../../../config/nas';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Sanitize the file path
    const sanitizedPath = filePath.replace(/\.\./g, '').replace(/\/+/g, '/');
    const fullFilePath = join(NAS_CONFIG.STORAGE_PATH, sanitizedPath);
    
    console.log(`Delete request for file: ${fullFilePath}`);
    
    // Check if file exists and is accessible
    try {
      await access(fullFilePath);
    } catch (error) {
      console.error('File not accessible:', error);
      return NextResponse.json(
        { error: 'File not found or not accessible' },
        { status: 404 }
      );
    }
    
    // Delete the file
    await unlink(fullFilePath);
    
    console.log(`Successfully deleted file: ${fullFilePath}`);
    
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      deletedPath: sanitizedPath
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
