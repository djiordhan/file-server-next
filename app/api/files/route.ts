import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { NAS_CONFIG, StorageUtils } from '../../config/nas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/';
    
    // Sanitize the path
    const sanitizedPath = path.replace(/\.\./g, '').replace(/\/+/g, '/');
    const fullPath = join(NAS_CONFIG.STORAGE_PATH, sanitizedPath);
    
    try {
      const items = await readdir(fullPath, { withFileTypes: true });
      const files = [];
      
      for (const item of items) {
        if (item.isFile()) {
          try {
            const filePath = join(fullPath, item.name);
            const stats = await stat(filePath);
            
            files.push({
              id: `${stats.mtime.getTime()}_${Math.random().toString(36).substring(2, 8)}`,
              name: item.name,
              size: stats.size,
              type: getFileType(item.name),
              path: `${sanitizedPath}/${item.name}`,
              uploadedAt: stats.mtime.toISOString(),
              sizeFormatted: StorageUtils.formatSize(stats.size)
            });
          } catch (error) {
            console.error(`Error reading file ${item.name}:`, error);
            // Skip files that can't be read
          }
        }
      }
      
      // Sort files by upload date (newest first)
      files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      return NextResponse.json({
        success: true,
        files,
        path: sanitizedPath,
        count: files.length
      });
      
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // Directory doesn't exist, return empty list
        return NextResponse.json({
          success: true,
          files: [],
          path: sanitizedPath,
          count: 0
        });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

function getFileType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
    return 'image/*';
  }
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '')) {
    return 'video/*';
  }
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension || '')) {
    return 'audio/*';
  }
  if (extension === 'pdf') {
    return 'application/pdf';
  }
  if (['doc', 'docx'].includes(extension || '')) {
    return 'application/msword';
  }
  if (['xls', 'xlsx'].includes(extension || '')) {
    return 'application/vnd.ms-excel';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
    return 'application/zip';
  }
  
  return 'application/octet-stream';
}
