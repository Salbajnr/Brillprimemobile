// @ts-ignore - AsyncStorage mock for development
const AsyncStorage = {
  getItem: async (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: async (key: string, value: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
  multiRemove: async (keys: string[]) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      keys.forEach(key => window.localStorage.removeItem(key));
    }
  }
};

import { apiService } from './api';

export interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: number;
  checksum: string;
  url: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number;
  pendingFiles: string[];
  failedFiles: string[];
  syncInProgress: boolean;
}

class FileSyncService {
  private apiService: typeof apiService;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_STORAGE_KEY = 'file_sync_status';
  private readonly FILES_STORAGE_KEY = 'cached_files';
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    this.apiService = apiService;
  }

  /**
   * Initialize file sync service
   */
  async initialize(): Promise<void> {
    await this.loadSyncStatus();
    this.startAutoSync();
  }

  /**
   * Start automatic file synchronization
   */
  startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      await this.syncFiles();
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Stop automatic file synchronization
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Fetch file list from web app
   */
  async fetchFileList(directory?: string): Promise<FileInfo[]> {
    try {
      const response = await this.apiService.api.get('/api/files/list', {
        params: { directory }
      });

      if (response.data.success) {
        return response.data.data.files || [];
      }
      
      throw new Error(response.data.message || 'Failed to fetch file list');
    } catch (error: any) {
      console.error('Error fetching file list:', error);
      throw error;
    }
  }

  /**
   * Download file from web app
   */
  async downloadFile(fileId: string, savePath?: string): Promise<string> {
    try {
      const response = await this.apiService.api.get(`/api/files/download/${fileId}`, {
        responseType: 'blob'
      });

      // Convert blob to base64 for React Native storage
      const base64Data = await this.blobToBase64(response.data);
      
      // Store file locally
      const localPath = savePath || `file_${fileId}_${Date.now()}`;
      await AsyncStorage.setItem(`file_${fileId}`, JSON.stringify({
        data: base64Data,
        path: localPath,
        downloadedAt: Date.now()
      }));

      return localPath;
    } catch (error: any) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Upload file to web app
   */
  async uploadFile(filePath: string, fileName: string, fileType: string): Promise<FileInfo> {
    try {
      // Read file data from local storage or file system
      const fileData = await AsyncStorage.getItem(`local_file_${filePath}`);
      
      if (!fileData) {
        throw new Error('File not found locally');
      }

      const formData = new FormData();
      formData.append('file', {
        uri: filePath,
        name: fileName,
        type: fileType,
      } as any);

      const response = await this.apiService.api.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        return response.data.data.file;
      }

      throw new Error(response.data.message || 'Failed to upload file');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Sync files between native app and web app
   */
  async syncFiles(): Promise<SyncStatus> {
    let syncStatus = await this.loadSyncStatus();
    
    try {
      syncStatus.syncInProgress = true;
      await this.saveSyncStatus(syncStatus);

      // Get remote file list
      const remoteFiles = await this.fetchFileList();
      
      // Get local cached files
      const localFiles = await this.getCachedFiles();
      
      // Determine files to download
      const filesToDownload = remoteFiles.filter(remoteFile => {
        const localFile = localFiles.find(local => local.id === remoteFile.id);
        return !localFile || localFile.lastModified < remoteFile.lastModified;
      });

      // Download new/updated files
      const downloadPromises = filesToDownload.map(async (file) => {
        try {
          await this.downloadFile(file.id);
          return file.id;
        } catch (error) {
          console.error(`Failed to download file ${file.id}:`, error);
          return null;
        }
      });

      const downloadResults = await Promise.allSettled(downloadPromises);
      
      // Update sync status
      const successfulDownloads = downloadResults
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => (result as PromiseFulfilledResult<string>).value);

      const failedDownloads = downloadResults
        .filter(result => result.status === 'rejected' || result.value === null);

      // Update cached files list
      await this.updateCachedFiles(remoteFiles);

      syncStatus = {
        isOnline: true,
        lastSyncTime: Date.now(),
        pendingFiles: [],
        failedFiles: failedDownloads.map((_, index) => filesToDownload[index].id),
        syncInProgress: false,
      };

    } catch (error) {
      console.error('File sync failed:', error);
      syncStatus = {
        ...syncStatus,
        isOnline: false,
        syncInProgress: false,
      };
    }

    await this.saveSyncStatus(syncStatus);
    return syncStatus;
  }

  /**
   * Get locally cached file
   */
  async getCachedFile(fileId: string): Promise<string | null> {
    try {
      const cachedFile = await AsyncStorage.getItem(`file_${fileId}`);
      if (cachedFile) {
        const fileData = JSON.parse(cachedFile);
        return fileData.data; // base64 data
      }
      return null;
    } catch (error) {
      console.error('Error getting cached file:', error);
      return null;
    }
  }

  /**
   * Delete local file
   */
  async deleteLocalFile(fileId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`file_${fileId}`);
    } catch (error) {
      console.error('Error deleting local file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata from web app
   */
  async getFileMetadata(fileId: string): Promise<FileInfo | null> {
    try {
      const response = await this.apiService.api.get(`/api/files/metadata/${fileId}`);
      
      if (response.data.success) {
        return response.data.data.file;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }

  /**
   * Search files on web app
   */
  async searchFiles(query: string, filters?: {
    type?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<FileInfo[]> {
    try {
      const response = await this.apiService.api.get('/api/files/search', {
        params: {
          q: query,
          type: filters?.type,
          dateFrom: filters?.dateFrom?.toISOString(),
          dateTo: filters?.dateTo?.toISOString(),
        }
      });

      if (response.data.success) {
        return response.data.data.files || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }

  // Private helper methods

  private async loadSyncStatus(): Promise<SyncStatus> {
    try {
      const statusStr = await AsyncStorage.getItem(this.SYNC_STORAGE_KEY);
      if (statusStr) {
        return JSON.parse(statusStr);
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
    
    return {
      isOnline: false,
      lastSyncTime: 0,
      pendingFiles: [],
      failedFiles: [],
      syncInProgress: false,
    };
  }

  private async saveSyncStatus(status: SyncStatus): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SYNC_STORAGE_KEY, JSON.stringify(status));
    } catch (error) {
      console.error('Error saving sync status:', error);
    }
  }

  private async getCachedFiles(): Promise<FileInfo[]> {
    try {
      const filesStr = await AsyncStorage.getItem(this.FILES_STORAGE_KEY);
      if (filesStr) {
        return JSON.parse(filesStr);
      }
    } catch (error) {
      console.error('Error getting cached files:', error);
    }
    return [];
  }

  private async updateCachedFiles(files: FileInfo[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.FILES_STORAGE_KEY, JSON.stringify(files));
    } catch (error) {
      console.error('Error updating cached files:', error);
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const fileSyncService = new FileSyncService();
export default FileSyncService;