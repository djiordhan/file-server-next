'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { FileList } from './components/FileList';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { NetworkInfo } from './components/NetworkInfo';
import { NAS_CONFIG, StorageUtils } from './config/nas';

export default function Home() {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [storageInfo, setStorageInfo] = useState({
    used: 0,
    total: StorageUtils.parseSize(NAS_CONFIG.MAX_TOTAL_UPLOADS),
    percentage: 0,
    fileCount: 0
  });

  // Load files from the server
  const loadFilesFromServer = useCallback(async (path: string) => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUploadedFiles(data.files);
          console.log('Loaded files from server:', data.files);
        }
      } else {
        console.error('Failed to load files:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  // Load files when path changes
  useEffect(() => {
    loadFilesFromServer(currentPath);
  }, [currentPath, loadFilesFromServer]);

  // Calculate storage usage from uploaded files
  const calculateStorageUsage = useCallback(() => {
    const totalUsed = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
    const total = StorageUtils.parseSize(NAS_CONFIG.MAX_TOTAL_UPLOADS);
    const percentage = StorageUtils.calculatePercentage(totalUsed, total);
    
    setStorageInfo({
      used: totalUsed,
      total,
      percentage,
      fileCount: uploadedFiles.length
    });
  }, [uploadedFiles]);

  // Check if upload would exceed limits
  const checkUploadLimits = useCallback((newFiles: File[]): { allowed: boolean; reason?: string } => {
    const currentUsed = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
    const newFilesSize = newFiles.reduce((sum, file) => sum + file.size, 0);
    const total = StorageUtils.parseSize(NAS_CONFIG.MAX_TOTAL_UPLOADS);
    const maxFiles = parseInt(NAS_CONFIG.MAX_FILES_COUNT);

    // Check file count limit
    if (uploadedFiles.length + newFiles.length > maxFiles) {
      return { 
        allowed: false, 
        reason: `Maximum file count (${maxFiles}) would be exceeded` 
      };
    }

    // Check storage size limit
    if (currentUsed + newFilesSize > total) {
      return { 
        allowed: false, 
        reason: `Storage limit (${NAS_CONFIG.MAX_TOTAL_UPLOADS}) would be exceeded` 
      };
    }

    return { allowed: true };
  }, [uploadedFiles]);

  // Update storage info when files change
  useEffect(() => {
    calculateStorageUsage();
  }, [uploadedFiles, calculateStorageUsage]);

  const handleFileUpload = useCallback((newFiles: File[]) => {
    const limitsCheck = checkUploadLimits(newFiles);
    
    if (!limitsCheck.allowed) {
      alert(`Upload blocked: ${limitsCheck.reason}`);
      return;
    }
    
    setFiles(prev => [...prev, ...newFiles]);
  }, [checkUploadLimits]);

  const handleFileRemove = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    try {
      // The actual upload is now handled by the FileUploader component
      // This function is called when upload completes successfully
      
      // Clear the selected files since they've been uploaded
      setFiles([]);
      
      // Note: The uploadedFiles state will be updated by the FileUploader component
      // after successful upload to the server
      
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  }, [files]);

  // Function to add uploaded files to the list (called by FileUploader after successful upload)
  const addUploadedFiles = useCallback((newFiles: any[]) => {
    console.log('Adding uploaded files to list:', newFiles);
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Refresh the file list from the server to ensure consistency
    setTimeout(() => {
      loadFilesFromServer(currentPath);
    }, 1000);
  }, [currentPath, loadFilesFromServer]);

  // Function to handle file deletion
  const handleFileDeleted = useCallback((fileId: string) => {
    console.log('File deleted:', fileId);
    // Remove the deleted file from the local state
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    
    // Refresh the file list from the server to ensure consistency
    setTimeout(() => {
      loadFilesFromServer(currentPath);
    }, 500);
  }, [currentPath, loadFilesFromServer]);

  const formatFileSize = (bytes: number): string => {
    return StorageUtils.formatSize(bytes);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <Header />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar 
          currentPath={currentPath}
          onPathChange={setCurrentPath}
          storageInfo={storageInfo}
        />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Network Information */}
            <NetworkInfo />
            
            {/* Storage Configuration Info */}
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Current Path:</span>
                    <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                      {currentPath}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Storage:</span> {StorageUtils.formatSize(storageInfo.used)} / {NAS_CONFIG.MAX_TOTAL_UPLOADS}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Configured Storage Directory:</span>
                  </div>
                  <div className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs text-slate-700 dark:text-slate-300">
                    {NAS_CONFIG.STORAGE_PATH}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    Files will be uploaded to: {NAS_CONFIG.STORAGE_PATH}{currentPath}
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <FileUploader
              files={files}
              onFilesAdded={handleFileUpload}
              onFileRemove={handleFileRemove}
              onUpload={handleUpload}
              isUploading={isUploading}
              currentPath={currentPath}
              storageInfo={storageInfo}
              maxTotalUploads={NAS_CONFIG.MAX_TOTAL_UPLOADS}
              maxFilesCount={NAS_CONFIG.MAX_FILES_COUNT}
              onUploadComplete={addUploadedFiles}
            />

            {/* View Mode Toggle */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                Files in {currentPath}
                {isLoadingFiles && (
                  <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                    (Loading...)
                  </span>
                )}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadFilesFromServer(currentPath)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title="Refresh file list"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* File List */}
            <FileList
              files={uploadedFiles}
              viewMode={viewMode}
              currentPath={currentPath}
              onFileDeleted={handleFileDeleted}
            />

            {/* Debug Info (remove in production) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-xs text-slate-600 dark:text-slate-400">
                <div className="font-medium mb-2">Debug Info:</div>
                <div>Uploaded Files Count: {uploadedFiles.length}</div>
                <div>Current Path: {currentPath}</div>
                <div>Storage Path: {NAS_CONFIG.STORAGE_PATH}</div>
                <div>Full Upload Path: {NAS_CONFIG.STORAGE_PATH}{currentPath}</div>
                <div>Loading Files: {isLoadingFiles ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
