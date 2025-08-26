'use client';

import { useState, useCallback, useRef } from 'react';
import { StorageUtils } from '../config/nas';
import { FileUploader as UploadUtil, UploadProgress } from '../utils/upload';

interface StorageInfo {
  used: number;
  total: number;
  percentage: number;
  fileCount: number;
}

interface FileUploaderProps {
  files: File[];
  onFilesAdded: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  onUpload: () => void;
  isUploading: boolean;
  currentPath: string;
  storageInfo: StorageInfo;
  maxTotalUploads: string;
  maxFilesCount: string;
  onUploadComplete: (files: any[]) => void;
}

export function FileUploader({
  files,
  onFilesAdded,
  onFileRemove,
  onUpload,
  isUploading,
  currentPath,
  storageInfo,
  maxTotalUploads,
  maxFilesCount,
  onUploadComplete
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onFilesAdded(droppedFiles);
    }
  }, [onFilesAdded]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      onFilesAdded(selectedFiles);
    }
  }, [onFilesAdded]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    return StorageUtils.formatSize(bytes);
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎬';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📄';
  };

  // Calculate if adding these files would exceed limits
  const getUploadWarning = () => {
    const newFilesSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalNewSize = storageInfo.used + newFilesSize;
    const totalNewFiles = storageInfo.fileCount + files.length;
    const maxSize = StorageUtils.parseSize(maxTotalUploads);
    const maxFiles = parseInt(maxFilesCount);

    if (totalNewSize > maxSize) {
      return {
        type: 'error' as const,
        message: `Upload would exceed storage limit (${maxTotalUploads})`
      };
    }

    if (totalNewFiles > maxFiles) {
      return {
        type: 'error' as const,
        message: `Upload would exceed file count limit (${maxFiles})`
      };
    }

    if (totalNewSize > maxSize * 0.9) {
      return {
        type: 'warning' as const,
        message: 'Upload would use more than 90% of storage'
      };
    }

    if (totalNewSize > maxSize * 0.75) {
      return {
        type: 'warning' as const,
        message: 'Upload would use more than 75% of storage'
      };
    }

    return null;
  };

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    setUploadStatus('uploading');
    
    // Initialize progress for all files
    const initialProgress: UploadProgress[] = files.map((file, index) => ({
      fileIndex: index,
      fileName: file.name,
      progress: 0,
      uploaded: 0,
      total: file.size,
      status: 'pending'
    }));
    setUploadProgress(initialProgress);

    try {
      const result = await UploadUtil.uploadFiles(
        files,
        currentPath,
        (progress) => {
          setUploadProgress(prev => {
            const newProgress = [...prev];
            newProgress[progress.fileIndex] = progress;
            return newProgress;
          });
        }
      );

      if (result.success) {
        setUploadStatus('completed');
        
        // Call the parent's onUploadComplete with the uploaded files
        if (result.files && result.files.length > 0) {
          onUploadComplete(result.files);
        }
        
        // Call the parent's onUpload to clear the file list
        onUpload();
        
        // Clear progress after a delay
        setTimeout(() => {
          setUploadProgress([]);
          setUploadStatus('idle');
        }, 3000);
      }
    } catch (error) {
      setUploadStatus('error');
      console.error('Upload failed:', error);
      // Keep progress visible to show errors
    }
  }, [files, currentPath, onUpload, onUploadComplete]);

  const uploadWarning = getUploadWarning();

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'uploading': return '📤';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending': return 'text-slate-500';
      case 'uploading': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Storage Limits Info */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-slate-500 dark:text-slate-400">Storage Used</div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {StorageUtils.formatSize(storageInfo.used)} / {maxTotalUploads}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {storageInfo.percentage.toFixed(1)}% used
            </div>
          </div>
          <div className="text-center">
            <div className="text-slate-500 dark:text-slate-400">Files Count</div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {storageInfo.fileCount} / {maxFilesCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {((storageInfo.fileCount / parseInt(maxFilesCount)) * 100).toFixed(1)}% used
            </div>
          </div>
          <div className="text-center">
            <div className="text-slate-500 dark:text-slate-400">Available</div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {StorageUtils.formatSize(storageInfo.total - storageInfo.used)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              remaining
            </div>
          </div>
        </div>
      </div>

      {/* Upload Warning */}
      {uploadWarning && (
        <div className={`rounded-xl p-4 border ${
          uploadWarning.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-center space-x-2">
            <span className={`text-lg ${
              uploadWarning.type === 'error' ? 'text-red-500' : 'text-yellow-500'
            }`}>
              {uploadWarning.type === 'error' ? '🚫' : '⚠️'}
            </span>
            <span className={`font-medium ${
              uploadWarning.type === 'error' ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              {uploadWarning.message}
            </span>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Upload Progress
            </h3>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {uploadStatus === 'uploading' && '📤 Uploading...'}
              {uploadStatus === 'completed' && '✅ Completed'}
              {uploadStatus === 'error' && '❌ Error'}
            </div>
          </div>
          
          <div className="space-y-4">
            {uploadProgress.map((progress, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStatusIcon(progress.status)}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">
                      {progress.fileName}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-600 dark:text-slate-300">
                      {StorageUtils.formatSize(progress.uploaded)} / {StorageUtils.formatSize(progress.total)}
                    </div>
                    <div className={`text-xs ${getStatusColor(progress.status)}`}>
                      {progress.progress.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      progress.status === 'error' 
                        ? 'bg-red-500' 
                        : progress.status === 'completed'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress.progress}%` }}
                  ></div>
                </div>
                
                {progress.error && (
                  <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    Error: {progress.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragOver
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Upload to: <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-sm">
                {currentPath}
              </span>
            </p>
            
            <button
              onClick={openFileDialog}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Select Files
            </button>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
        />
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Selected Files ({files.length})
            </h3>
            <button
              onClick={handleUpload}
              disabled={uploadStatus === 'uploading' || uploadWarning?.type === 'error'}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                uploadStatus === 'uploading' || uploadWarning?.type === 'error'
                  ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {uploadStatus === 'uploading' ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Upload Files</span>
                </div>
              )}
            </button>
          </div>
          
          <div className="space-y-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getFileIcon(file.type)}</span>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => onFileRemove(index)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
