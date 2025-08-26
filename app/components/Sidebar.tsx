'use client';

import { useState } from 'react';
import { StorageUtils } from '../config/nas';

interface StorageInfo {
  used: number;
  total: number;
  percentage: number;
  fileCount: number;
}

interface SidebarProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  storageInfo: StorageInfo;
}

export function Sidebar({ currentPath, onPathChange, storageInfo }: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/', '/Documents', '/Pictures', '/Music']));

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const folderStructure = [
    {
      name: 'Home',
      path: '/',
      icon: '🏠',
      children: [
        { name: 'Documents', path: '/Documents', icon: '📄' },
        { name: 'Pictures', path: '/Pictures', icon: '🖼️' },
        { name: 'Music', path: '/Music', icon: '🎵' },
        { name: 'Videos', path: '/Videos', icon: '🎬' },
        { name: 'Downloads', path: '/Downloads', icon: '⬇️' },
        { name: 'Backups', path: '/Backups', icon: '💾' }
      ]
    },
    {
      name: 'Shared',
      path: '/shared',
      icon: '👥',
      children: [
        { name: 'Public', path: '/shared/public', icon: '🌐' },
        { name: 'Team', path: '/shared/team', icon: '👨‍💼' },
        { name: 'Projects', path: '/shared/projects', icon: '📁' }
      ]
    },
    {
      name: 'System',
      path: '/system',
      icon: '⚙️',
      children: [
        { name: 'Logs', path: '/system/logs', icon: '📋' },
        { name: 'Config', path: '/system/config', icon: '🔧' }
      ]
    }
  ];

  const renderFolder = (folder: any, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.path);
    const isCurrent = currentPath === folder.path;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.path}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleFolder(folder.path);
            }
            onPathChange(folder.path);
          }}
          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
            isCurrent
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          {hasChildren && (
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          <span className="text-lg">{folder.icon}</span>
          <span className="font-medium truncate">{folder.name}</span>
        </button>
        
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {folder.children.map((child: any) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getStorageStatusColor = () => {
    return StorageUtils.getStorageStatusColor(storageInfo.percentage);
  };

  const getStorageStatusText = () => {
    if (storageInfo.percentage >= 90) return 'Critical';
    if (storageInfo.percentage >= 75) return 'Warning';
    if (storageInfo.percentage >= 50) return 'Moderate';
    return 'Good';
  };

  return (
    <aside className="w-64 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-r border-slate-200/50 dark:border-slate-700/50 overflow-y-auto">
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Quick Access
          </h2>
          <div className="space-y-1">
            {folderStructure.map(folder => renderFolder(folder))}
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-3">
            <span>Storage Usage</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              storageInfo.percentage >= 90 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : storageInfo.percentage >= 75
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : storageInfo.percentage >= 50
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              {getStorageStatusText()}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Used</span>
              <span className="font-medium">{StorageUtils.formatSize(storageInfo.used)}</span>
            </div>
            
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-300 bg-gradient-to-r ${getStorageStatusColor()}`}
                style={{ width: `${storageInfo.percentage}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Total</span>
              <span className="font-medium">{StorageUtils.formatSize(storageInfo.total)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Files</span>
              <span className="font-medium">{storageInfo.fileCount}</span>
            </div>
            
            <div className="text-xs text-slate-400 dark:text-slate-500 text-center">
              {storageInfo.percentage.toFixed(1)}% used
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
