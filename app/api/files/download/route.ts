import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { NAS_CONFIG } from '../../../config/nas';

export async function GET(request: NextRequest) {
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
    
    console.log(`Download request for file: ${fullFilePath}`);
    
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
    
    // Read the file
    const fileBuffer = await readFile(fullFilePath);
    
    // Get filename from path
    const fileName = sanitizedPath.split('/').pop() || 'download';
    
    // Create response with appropriate headers
    const response = new NextResponse(fileBuffer);
    response.headers.set('Content-Type', 'application/octet-stream');
    response.headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    response.headers.set('Content-Length', fileBuffer.length.toString());
    
    console.log(`Successfully serving file: ${fileName} (${fileBuffer.length} bytes)`);
    
    return response;
    
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
