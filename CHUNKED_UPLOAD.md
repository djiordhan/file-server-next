# Chunked Upload System

## Overview
This document explains how the chunked upload system works in the file uploader application and how it resolves the issue where large files were being split into multiple blob files.

## Problem Description
Previously, when uploading large files (e.g., 1GB), the system would:
1. Split the file into 1MB chunks
2. Upload each chunk separately
3. Save each chunk as an individual file
4. Result: Multiple blob files instead of one complete file

## Solution: Proper Chunked Upload
The new system now:
1. Splits large files into configurable chunks (default: 5MB)
2. Uploads each chunk to the server
3. Server reassembles chunks into a temporary file
4. When all chunks are received, creates the final complete file
5. Cleans up temporary files

## How It Works

### 1. Client-Side Chunking
- Files larger than `CHUNK_SIZE` (configurable, default 5MB) are automatically chunked
- Each chunk is uploaded separately with metadata:
  - `chunkIndex`: Current chunk number (0-based)
  - `totalChunks`: Total number of chunks
  - `fileName`: Original filename
  - `path`: Upload destination

### 2. Server-Side Processing
- API detects chunked uploads by checking for chunk metadata
- First chunk creates a temporary file
- Subsequent chunks are appended to the temporary file
- Final chunk triggers file completion and cleanup

### 3. Configuration
```typescript
// In app/config/nas.ts
CHUNK_SIZE: process.env.NEXT_PUBLIC_CHUNK_SIZE || '5MB'
```

## Benefits
- **Memory Efficient**: Large files don't consume excessive browser memory
- **Resumable**: Could be extended to support resume functionality
- **Progress Tracking**: Real-time upload progress for each chunk
- **Reliable**: Better handling of network interruptions
- **Single File**: Results in one complete file instead of multiple chunks

## Technical Details

### Chunk Size Calculation
```typescript
private static CHUNK_SIZE = Math.max(1024 * 1024, StorageUtils.parseSize(NAS_CONFIG.CHUNK_SIZE));
// Minimum 1MB chunks, configurable via environment variable
```

### Temporary File Naming
```typescript
const fileHash = Buffer.from(fileName).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
const tempFileName = `temp_${fileHash}_${Date.now()}`;
```

### File Reassembly
```typescript
if (chunkIndex === 0) {
  // First chunk - create new file
  await writeFile(tempFilePath, buffer);
} else {
  // Subsequent chunks - append to existing file
  await appendFile(tempFilePath, buffer);
}
```

## Environment Variables
```bash
NEXT_PUBLIC_CHUNK_SIZE=5MB  # Size at which chunking begins
```

## Testing
To test the chunked upload system:
1. Upload a file larger than the configured chunk size
2. Check browser console for chunking logs
3. Verify only one final file is created on the server
4. Confirm file size matches the original

## Future Enhancements
- Resume interrupted uploads
- Parallel chunk uploads
- MD5/SHA256 verification
- Progress persistence across page reloads
