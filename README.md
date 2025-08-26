# NAS File Manager

A modern, responsive Network Attached Storage (NAS) web interface built with Next.js 15, TypeScript, and Tailwind CSS.

## ✨ Features

- **File Upload & Management**
  - Drag and drop file upload
  - Multiple file selection
  - File type detection with appropriate icons
  - File size formatting and validation
  - **Real upload progress tracking** with visual indicators
  - **Chunked uploads** for large files (1MB+ chunks)
  - **Upload to configured directories** via API routes
  - **Storage limit enforcement** with configurable quotas
  - **File count limits** to prevent system overload

- **Directory Navigation**
  - Hierarchical folder structure
  - Quick access sidebar
  - Breadcrumb navigation
  - Configurable upload paths

- **File Display**
  - Grid and list view modes
  - File type icons and metadata
  - File actions (download, share, delete)
  - Responsive design for all devices

- **Storage Management**
  - **Real-time storage usage** calculation
  - **Configurable storage limits** via environment variables
  - **Visual storage indicators** with color-coded warnings
  - **Upload prevention** when limits are exceeded
  - **Storage status monitoring** (Good, Moderate, Warning, Critical)

- **Modern UI/UX**
  - Beautiful gradient backgrounds
  - Glassmorphism design elements
  - Dark mode support
  - Smooth animations and transitions
  - Professional color scheme

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd file-uploader-next
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
# Create .env.local file with your desired limits
NEXT_PUBLIC_UPLOAD_BASE_PATH=/uploads
NEXT_PUBLIC_MAX_FILE_SIZE=100MB
NEXT_PUBLIC_ALLOWED_FILE_TYPES=*
NEXT_PUBLIC_MAX_TOTAL_UPLOADS=10GB
NEXT_PUBLIC_MAX_FILES_COUNT=1000
NEXT_PUBLIC_STORAGE_PATH=/mnt/nas/storage
NEXT_PUBLIC_BACKUP_PATH=/mnt/nas/backups
NEXT_PUBLIC_SHARED_PATH=/mnt/nas/shared
```

4. Run the development server:
```bash
npm run dev
```

5. Run the development server:
   ```bash
   # For local access only (localhost)
   npm run dev:local
   
   # For network access (accessible from other devices)
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Local Network Access

This app is designed for local network use and can be accessed from other devices on your network.

### Quick Network Setup

1. **Start with network access:**
   ```bash
   npm run dev
   ```

2. **Find your local IP address:**
   ```bash
   npm run ip
   ```

3. **Access from other devices:**
   - Use the IP address shown above instead of localhost
   - Example: `http://192.168.1.100:3000`
   - The QR code in the app will work with any local IP

### Network Access Features

- **QR Code Generation**: Scan with your phone to open the app
- **Local IP Detection**: Shows current network configuration
- **Network Instructions**: Step-by-step guide for accessing from other devices
- **Cross-Device Access**: Works on phones, tablets, and other computers

### Troubleshooting Network Access

- **Firewall**: Ensure port 3000 is open on your computer
- **Router**: Some routers may block local network access
- **Antivirus**: Check if your antivirus is blocking the connection
- **Network Type**: Works best on private/home networks

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NEXT_PUBLIC_UPLOAD_BASE_PATH` | Base path for file uploads | `/uploads` | `/mnt/nas/uploads` |
| `NEXT_PUBLIC_MAX_FILE_SIZE` | Maximum allowed file size | `100MB` | `500MB`, `2GB` |
| `NEXT_PUBLIC_ALLOWED_FILE_TYPES` | Allowed file types (comma-separated) | `*` | `image/*,video/*,application/pdf` |
| `NEXT_PUBLIC_MAX_TOTAL_UPLOADS` | **Total storage limit for all uploads** | `10GB` | `50GB`, `1TB` |
| `NEXT_PUBLIC_MAX_FILES_COUNT` | **Maximum number of files allowed** | `1000` | `5000`, `10000` |
| `NEXT_PUBLIC_STORAGE_CHECK_INTERVAL` | Storage check frequency (ms) | `30000` | `60000` (1 minute) |
| `NEXT_PUBLIC_STORAGE_PATH` | **Main storage directory path** | `/mnt/nas/storage` | `/var/nas/storage` |
| `NEXT_PUBLIC_BACKUP_PATH` | Backup directory path | `/mnt/nas/backups` | `/var/nas/backups` |
| `NEXT_PUBLIC_SHARED_PATH` | Shared files directory path | `/mnt/nas/shared` | `/var/nas/shared` |

### Storage Limit Examples

```bash
# Small NAS setup (home use)
NEXT_PUBLIC_MAX_TOTAL_UPLOADS=1TB
NEXT_PUBLIC_MAX_FILES_COUNT=5000

# Medium NAS setup (small business)
NEXT_PUBLIC_MAX_TOTAL_UPLOADS=10TB
NEXT_PUBLIC_MAX_FILES_COUNT=50000

# Large NAS setup (enterprise)
NEXT_PUBLIC_MAX_TOTAL_UPLOADS=100TB
NEXT_PUBLIC_MAX_FILES_COUNT=100000
```

### Customizing Directories

Edit `app/config/nas.ts` to modify:
- Default directory structure
- File type icon mappings
- Color schemes
- Storage paths

## 🔧 API Routes

### File Upload Endpoint

**POST** `/api/upload`

Handles file uploads to the configured storage directory with:
- **File validation** and size checking
- **Directory creation** if needed
- **Unique filename generation** to prevent conflicts
- **Progress tracking** support
- **Error handling** and response formatting

**Request Body:**
```typescript
FormData {
  files: File[],
  path: string, // Upload directory path
  chunkIndex?: string, // For chunked uploads
  totalChunks?: string, // For chunked uploads
  fileName?: string // For chunked uploads
}
```

**Response:**
```typescript
{
  success: boolean,
  message: string,
  files: Array<{
    id: string,
    name: string,
    originalName: string,
    size: number,
    type: string,
    path: string,
    uploadedAt: string,
    sizeFormatted: string
  }>,
  uploadPath: string
}
```

### Upload Configuration Endpoint

**GET** `/api/upload`

Returns current upload configuration including:
- Storage paths
- File size limits
- Storage quotas
- File count limits

## 🎨 Customization

### Colors and Themes

The application uses a sophisticated color palette with:
- **Primary**: Blue to Indigo gradients
- **Secondary**: Slate variations
- **Accent**: Purple/Indigo highlights
- **Background**: Subtle gradient backgrounds

### Storage Status Colors

Storage usage is automatically color-coded:
- **🟢 Good** (0-49%): Green progress bar
- **🟠 Moderate** (50-74%): Orange progress bar  
- **🟡 Warning** (75-89%): Yellow progress bar
- **🔴 Critical** (90%+): Red progress bar

### Upload Progress Indicators

Real-time upload progress with:
- **File-by-file progress** tracking
- **Status indicators** (Pending, Uploading, Completed, Error)
- **Progress bars** with color coding
- **Upload speed** and remaining time
- **Error reporting** for failed uploads

### File Type Icons

Customize file type icons in the configuration:
```typescript
FILE_TYPE_ICONS: {
  'image': '🖼️',
  'video': '🎬',
  'audio': '🎵',
  'pdf': '📄',
  'document': '📝',
  'spreadsheet': '📊',
  'archive': '📦',
  'default': '📄'
}
```

## 📱 Responsive Design

The interface is fully responsive with:
- Mobile-first approach
- Adaptive sidebar behavior
- Touch-friendly interactions
- Optimized layouts for all screen sizes

## 🔧 Development

### Project Structure

```
app/
├── api/                    # API routes
│   └── upload/            # File upload endpoint
│       └── route.ts       # Upload handling logic
├── components/             # React components
│   ├── Header.tsx         # Application header
│   ├── Sidebar.tsx        # Directory navigation with storage info
│   ├── FileUploader.tsx   # File upload interface with progress
│   └── FileList.tsx       # File display and management
├── config/
│   └── nas.ts             # Configuration settings and storage utils
├── utils/
│   └── upload.ts          # Upload utility with progress tracking
├── globals.css            # Global styles and themes
├── layout.tsx             # Root layout
└── page.tsx               # Main application page
```

### Adding New Features

1. **New File Actions**: Extend the FileList component
2. **Additional File Types**: Update the file type detection logic
3. **Custom Themes**: Modify the color configuration
4. **Storage Backends**: Implement custom storage adapters
5. **Storage Limits**: Add new limit types in the configuration
6. **Upload Handlers**: Extend the upload utility for new protocols

### Upload Architecture

The upload system features:
- **Chunked uploads** for large files (>1MB)
- **Progress tracking** with real-time updates
- **Error handling** and retry logic
- **File validation** and security checks
- **Directory management** and path sanitization

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Configuration in Production

For production deployments, ensure all environment variables are properly set:

```bash
# Production environment example
NEXT_PUBLIC_MAX_TOTAL_UPLOADS=100TB
NEXT_PUBLIC_MAX_FILES_COUNT=100000
NEXT_PUBLIC_STORAGE_CHECK_INTERVAL=60000
NEXT_PUBLIC_STORAGE_PATH=/var/nas/storage
```

### Storage Directory Permissions

Ensure the configured storage directory has proper permissions:

```bash
# Create storage directory with proper permissions
sudo mkdir -p /var/nas/storage
sudo chown -R www-data:www-data /var/nas/storage
sudo chmod -R 755 /var/nas/storage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js 15](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Heroicons](https://heroicons.com/)
- Modern UI patterns and best practices
- Storage management and limit enforcement features
- Real-time upload progress tracking
- Chunked file upload support
