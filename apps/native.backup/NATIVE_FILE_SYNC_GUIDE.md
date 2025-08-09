# Native File Sync System - Integration Guide

This guide explains how to use the native file fetching system to sync files between the BrillPrime web application and React Native mobile app.

## Overview

The native file sync system allows the React Native app to:
- Fetch file listings from the main web application
- Download files for offline access
- Upload files from mobile to web
- Search and filter web-based files
- Automatic background synchronization
- Progress tracking for large downloads

## System Architecture

```
Web Application (uploads/) → API Endpoints → Native App (AsyncStorage)
                                ↓
                         File Sync Service
                                ↓
                       Local Cache Management
```

## Core Components

### 1. FileSyncService (`fileSync.ts`)
- Low-level file operations
- Handles API communication
- Manages local storage
- Background sync scheduling

### 2. WebFileFetcher (`webFileFetcher.ts`)
- High-level abstraction
- Progress tracking
- Batch operations
- Error handling

### 3. FileManagerScreen (`FileManagerScreen.tsx`)
- User interface for file management
- Directory navigation
- Search functionality
- Download progress display

## API Endpoints

The system uses the following web app endpoints:

```
GET /api/files/list                 - List files in directory
GET /api/files/download/:fileId     - Download specific file
POST /api/files/upload              - Upload file to web
GET /api/files/metadata/:fileId     - Get file metadata
GET /api/files/search               - Search files
GET /api/files/sync/status          - Get sync status
DELETE /api/files/:fileId           - Delete file
```

## Usage Examples

### Basic File Fetching

```typescript
import { webFileFetcher } from './services/webFileFetcher';

// Initialize the service
await webFileFetcher.initialize();

// Fetch files from web app
const files = await webFileFetcher.fetchWebFiles({
  directory: 'uploads/',
  maxFiles: 50,
  fileTypes: ['.pdf', '.jpg', '.png']
});

console.log(`Found ${files.length} files`);
```

### Download Files with Progress

```typescript
// Download specific files
const fileIds = ['file1', 'file2', 'file3'];
const result = await webFileFetcher.downloadFiles(fileIds);

console.log(`Downloaded: ${result.success.length}`);
console.log(`Failed: ${result.failed.length}`);

// Monitor progress
webFileFetcher.onProgress((progress) => {
  console.log(`Progress: ${progress.progress}%`);
  console.log(`Current: ${progress.currentFile}`);
});
```

### Search Files

```typescript
// Search by name
const searchResults = await webFileFetcher.searchWebFiles('invoice', {
  type: '.pdf',
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-12-31')
});

console.log(`Found ${searchResults.length} invoices`);
```

### Upload to Web App

```typescript
// Upload file from mobile to web
const uploadedFile = await webFileFetcher.uploadToWeb(
  '/local/path/document.pdf',
  'document.pdf',
  'application/pdf'
);

console.log(`Uploaded: ${uploadedFile.name}`);
```

### Automatic Sync

```typescript
// Start background sync (runs every 30 seconds)
webFileFetcher.startAutoSync();

// Stop background sync
webFileFetcher.stopAutoSync();

// Manual full sync
await webFileFetcher.syncAllFiles();
```

## File Structure

```
native-setup/src/
├── services/
│   ├── fileSync.ts          # Core sync service
│   ├── webFileFetcher.ts    # High-level wrapper
│   └── api.ts              # Base API service
├── screens/
│   └── FileManagerScreen.tsx # File management UI
├── store/slices/
│   └── appSlice.ts         # App-wide state (sync status)
└── types/
    └── files.ts            # File-related TypeScript types
```

## Configuration

### Environment Variables

Add these to your environment configuration:

```bash
# Web app base URL
REACT_NATIVE_API_BASE_URL=https://yourapp.replit.app

# File sync settings
REACT_NATIVE_SYNC_INTERVAL=30000  # 30 seconds
REACT_NATIVE_MAX_FILE_SIZE=10485760  # 10MB
REACT_NATIVE_CACHE_DIRECTORY=files/
```

### Permissions (React Native)

Add these permissions to your app configuration:

**Android (`android/app/src/main/AndroidManifest.xml`):**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

**iOS (`ios/YourApp/Info.plist`):**
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>App needs access to photo library to upload images</string>
<key>NSDocumentsFolderUsageDescription</key>
<string>App needs access to documents to manage files</string>
```

## Error Handling

The system provides comprehensive error handling:

```typescript
try {
  const files = await webFileFetcher.fetchWebFiles();
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Handle offline mode
    console.log('Working offline');
  } else if (error.code === 'AUTH_ERROR') {
    // Handle authentication issues
    console.log('User needs to log in');
  } else {
    // Handle other errors
    console.error('File sync error:', error.message);
  }
}
```

## Performance Optimization

### Caching Strategy

1. **Local Cache**: Files are cached locally using AsyncStorage
2. **Metadata Cache**: File metadata is cached separately for quick listing
3. **Progressive Download**: Large files are downloaded in chunks
4. **Background Sync**: Automatic sync runs in background with throttling

### Memory Management

```typescript
// Clean up old cached files
await webFileFetcher.cleanupCache({
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSize: 100 * 1024 * 1024 // 100MB
});

// Get cache statistics
const cacheStats = await webFileFetcher.getCacheStats();
console.log(`Cache size: ${cacheStats.totalSize}`);
console.log(`File count: ${cacheStats.fileCount}`);
```

## Integration with Redux

The file sync system integrates with the Redux store:

```typescript
// store/slices/appSlice.ts
interface AppState {
  fileSyncStatus: {
    isOnline: boolean;
    lastSyncTime: number;
    syncInProgress: boolean;
    totalFiles: number;
    cachedFiles: number;
  };
}

// Update sync status in store
dispatch(updateFileSyncStatus({
  isOnline: true,
  lastSyncTime: Date.now(),
  syncInProgress: false,
  totalFiles: files.length,
  cachedFiles: cachedFiles.length
}));
```

## UI Components

### File Manager Screen Features

- **Directory Navigation**: Browse different folders
- **Search Functionality**: Find files by name, type, date
- **Download Progress**: Real-time progress tracking
- **File Actions**: Download, view info, delete
- **Refresh Control**: Pull-to-refresh file listings
- **Offline Mode**: Show cached files when offline

### Custom File List Component

```tsx
import { FileManagerScreen } from './screens/FileManagerScreen';

// Use in navigation
<Stack.Screen 
  name="FileManager" 
  component={FileManagerScreen}
  options={{ 
    title: 'Files',
    headerRight: () => (
      <TouchableOpacity onPress={handleSync}>
        <Text>Sync</Text>
      </TouchableOpacity>
    )
  }}
/>
```

## Security Considerations

1. **Authentication**: All API calls require valid user authentication
2. **File Validation**: Server validates file types and sizes
3. **Secure Storage**: Local files are stored securely
4. **Network Security**: HTTPS/TLS for all communications
5. **Access Control**: Users can only access their own files

## Testing

### Unit Tests

```typescript
// __tests__/fileSync.test.ts
import { webFileFetcher } from '../services/webFileFetcher';

describe('WebFileFetcher', () => {
  test('should fetch files from web app', async () => {
    const files = await webFileFetcher.fetchWebFiles();
    expect(files).toBeDefined();
    expect(Array.isArray(files)).toBe(true);
  });

  test('should handle network errors', async () => {
    // Mock network failure
    await expect(webFileFetcher.fetchWebFiles()).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/fileSync.integration.test.ts
describe('File Sync Integration', () => {
  test('should sync files end-to-end', async () => {
    // Test full sync flow
    await webFileFetcher.initialize();
    const files = await webFileFetcher.fetchWebFiles();
    const result = await webFileFetcher.downloadFiles([files[0].id]);
    
    expect(result.success).toContain(files[0].id);
  });
});
```

## Troubleshooting

### Common Issues

1. **Network Connectivity**
   ```typescript
   // Check connectivity before sync
   if (!await webFileFetcher.isOnline()) {
     console.log('Device is offline');
     // Use cached files
   }
   ```

2. **Storage Limits**
   ```typescript
   // Check available storage
   const storageInfo = await webFileFetcher.getStorageInfo();
   if (storageInfo.available < requiredSpace) {
     // Clean up or show warning
   }
   ```

3. **Authentication Expires**
   ```typescript
   // Handle auth errors
   webFileFetcher.onError((error) => {
     if (error.code === 'AUTH_EXPIRED') {
       // Redirect to login
       navigation.navigate('Login');
     }
   });
   ```

## Future Enhancements

1. **Conflict Resolution**: Handle file conflicts during sync
2. **Selective Sync**: Allow users to choose which files to sync
3. **File Versioning**: Track file changes and versions
4. **Collaborative Features**: Real-time file sharing
5. **Advanced Search**: Full-text search within documents
6. **Offline Editing**: Edit files offline with sync on reconnection

## Support

For questions or issues with the native file sync system:

1. Check the logs in the File Manager screen
2. Verify network connectivity
3. Ensure proper authentication
4. Review file permissions
5. Contact support with error details

---

This file sync system provides a robust foundation for file management between the web app and native mobile app, ensuring users have seamless access to their files across platforms.