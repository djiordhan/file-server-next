export const NAS_CONFIG = {
  // Upload configuration
  UPLOAD_BASE_PATH: process.env.NEXT_PUBLIC_UPLOAD_BASE_PATH || '/uploads',
  MAX_FILE_SIZE: process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '100MB',
  ALLOWED_FILE_TYPES: process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || '*',
  
  // Storage limits and configuration
  MAX_TOTAL_UPLOADS: process.env.NEXT_PUBLIC_MAX_TOTAL_UPLOADS || '10GB',
  MAX_FILES_COUNT: process.env.NEXT_PUBLIC_MAX_FILES_COUNT || '1000',
  STORAGE_CHECK_INTERVAL: process.env.NEXT_PUBLIC_STORAGE_CHECK_INTERVAL || '30000', // 30 seconds
  
  // Storage paths
  STORAGE_PATH: process.env.NEXT_PUBLIC_STORAGE_PATH || '/mnt/nas/storage',
  BACKUP_PATH: process.env.NEXT_PUBLIC_BACKUP_PATH || '/mnt/nas/backups',
  SHARED_PATH: process.env.NEXT_PUBLIC_SHARED_PATH || '/mnt/nas/shared',
  
  // Default directories
  DEFAULT_DIRECTORIES: [
    '/',
    '/Documents',
    '/Pictures', 
    '/Music',
    '/Videos',
    '/Downloads',
    '/Backups',
    '/shared/public',
    '/shared/team',
    '/shared/projects',
    '/system/logs',
    '/system/config'
  ],
  
  // File type icons mapping
  FILE_TYPE_ICONS: {
    'image': '🖼️',
    'video': '🎬',
    'audio': '🎵',
    'pdf': '📄',
    'document': '📝',
    'spreadsheet': '📊',
    'archive': '📦',
    'default': '📄'
  },
  
  // Theme colors
  COLORS: {
    primary: {
      light: 'from-blue-500 to-indigo-600',
      dark: 'from-blue-400 to-indigo-500'
    },
    secondary: {
      light: 'from-slate-100 to-slate-200',
      dark: 'from-slate-700 to-slate-600'
    },
    background: {
      light: 'from-slate-50 via-blue-50 to-indigo-100',
      dark: 'from-slate-900 via-slate-800 to-indigo-900'
    }
  }
};

// Utility functions for storage calculations
export const StorageUtils = {
  // Convert human-readable size to bytes
  parseSize: (sizeString: string): number => {
    const units: { [key: string]: number } = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };
    
    const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B)$/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return value * (units[unit] || 1);
  },

  // Convert bytes to human-readable size
  formatSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Calculate percentage
  calculatePercentage: (used: number, total: number): number => {
    if (total === 0) return 0;
    return Math.min((used / total) * 100, 100);
  },

  // Get storage status color
  getStorageStatusColor: (percentage: number): string => {
    if (percentage >= 90) return 'from-red-500 to-red-600';
    if (percentage >= 75) return 'from-yellow-500 to-yellow-600';
    if (percentage >= 50) return 'from-orange-500 to-orange-600';
    return 'from-green-500 to-green-600';
  }
};
