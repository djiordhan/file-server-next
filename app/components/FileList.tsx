'use client';

import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';

interface FileListProps {
  files: any[];
  viewMode: 'grid' | 'list';
  currentPath: string;
  onFileDeleted?: (fileId: string) => void;
}

export function FileList({ files, viewMode, currentPath, onFileDeleted }: FileListProps) {
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    file: any | null;
  }>({
    isOpen: false,
    file: null
  });

  const getFileIcon = (type: string): string => {
    if (type.includes('image')) return '🖼️';
    if (type.includes('video')) return '🎬';
    if (type.includes('audio')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('document')) return '📝';
    if (type.includes('spreadsheet')) return '📊';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    return '📄';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(file.path)}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  const handleDelete = async (file: any) => {
    try {
      const response = await fetch(`/api/files/delete?path=${encodeURIComponent(file.path)}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Notify parent component about the deletion
        if (onFileDeleted) {
          onFileDeleted(file.id);
        }
        
        // Close the modal
        setDeleteModal({ isOpen: false, file: null });
        
        console.log('File deleted successfully:', result.message);
      } else {
        throw new Error(result.error || 'Delete failed');
      }
      
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file');
    }
  };

  const openDeleteModal = (file: any) => {
    setDeleteModal({ isOpen: true, file });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, file: null });
  };

  if (files.length === 0) {
    return (
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-12 border border-slate-200/50 dark:border-slate-700/50 text-center">
        <div className="text-6xl mb-4">📁</div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">
          No files found
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          This directory is empty. Upload some files to get started.
        </p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-200"
            >
              <div className="text-center mb-3">
                <span className="text-4xl">{getFileIcon(file.type)}</span>
              </div>
              
              <div className="text-center mb-3">
                <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate" title={file.name}>
                  {file.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {file.sizeFormatted}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDate(file.uploadedAt)}
                </p>
              </div>
              
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => handleDownload(file)}
                  className="p-2 text-slate-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="Download"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => openDeleteModal(file)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          title="Delete File"
          message={`Are you sure you want to delete "${deleteModal.file?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => deleteModal.file && handleDelete(deleteModal.file)}
          onCancel={closeDeleteModal}
          type="danger"
        />
      </>
    );
  }

  // List view
  return (
    <>
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getFileIcon(file.type)}</span>
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {file.name}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {file.path}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    {file.sizeFormatted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {formatDate(file.uploadedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-2 text-slate-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="Download"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openDeleteModal(file)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete File"
        message={`Are you sure you want to delete "${deleteModal.file?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => deleteModal.file && handleDelete(deleteModal.file)}
        onCancel={closeDeleteModal}
        type="danger"
      />
    </>
  );
}
