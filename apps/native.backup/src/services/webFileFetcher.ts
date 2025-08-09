/**
 * Web File Fetcher Service
 * Handles fetching files from the main web application for native app consumption
 */

import { fileSyncService, type FileInfo } from './fileSync';

export interface WebFileOptions {
  directory?: string;
  fileTypes?: string[];
  maxFiles?: number;
  includeHidden?: boolean;
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  currentFile?: string;
  progress: number;
}

class WebFileFetcher {
  private syncInProgress = false;
  private currentProgress: SyncProgress = {
    total: 0,
    completed: 0,
    failed: 0,
    progress: 0
  };
  private onProgressCallbacks: ((progress: SyncProgress) => void)[] = [];

  /**
   * Initialize the web file fetcher
   */
  async initialize(): Promise<void> {
    await fileSyncService.initialize();
    console.log('[WebFileFetcher] Initialized successfully');
  }

  /**
   * Fetch files from the main web application
   */
  async fetchWebFiles(options: WebFileOptions = {}): Promise<FileInfo[]> {
    try {
      const files = await fileSyncService.fetchFileList(options.directory);
      
      let filteredFiles = files;
      
      // Filter by file types if specified
      if (options.fileTypes && options.fileTypes.length > 0) {
        filteredFiles = files.filter(file => 
          options.fileTypes!.some(type => file.type.includes(type))
        );
      }
      
      // Filter hidden files if specified
      if (!options.includeHidden) {
        filteredFiles = filteredFiles.filter(file => !file.name.startsWith('.'));
      }
      
      // Limit number of files if specified
      if (options.maxFiles && options.maxFiles > 0) {
        filteredFiles = filteredFiles.slice(0, options.maxFiles);
      }
      
      console.log(`[WebFileFetcher] Found ${filteredFiles.length} files matching criteria`);
      return filteredFiles;
      
    } catch (error) {
      console.error('[WebFileFetcher] Error fetching web files:', error);
      throw error;
    }
  }

  /**
   * Download specific files from web app to native storage
   */
  async downloadFiles(fileIds: string[]): Promise<{ success: string[], failed: string[] }> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    this.currentProgress = {
      total: fileIds.length,
      completed: 0,
      failed: 0,
      progress: 0
    };

    const success: string[] = [];
    const failed: string[] = [];

    try {
      for (let i = 0; i < fileIds.length; i++) {
        const fileId = fileIds[i];
        
        this.currentProgress.currentFile = fileId;
        this.notifyProgress();
        
        try {
          await fileSyncService.downloadFile(fileId);
          success.push(fileId);
          this.currentProgress.completed++;
        } catch (error) {
          console.error(`[WebFileFetcher] Failed to download file ${fileId}:`, error);
          failed.push(fileId);
          this.currentProgress.failed++;
        }
        
        this.currentProgress.progress = ((i + 1) / fileIds.length) * 100;
        this.notifyProgress();
      }
      
      return { success, failed };
      
    } finally {
      this.syncInProgress = false;
      this.currentProgress.currentFile = undefined;
      this.notifyProgress();
    }
  }

  /**
   * Search for files on the web application
   */
  async searchWebFiles(
    query: string, 
    filters?: {
      type?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<FileInfo[]> {
    try {
      return await fileSyncService.searchFiles(query, filters);
    } catch (error) {
      console.error('[WebFileFetcher] Error searching web files:', error);
      throw error;
    }
  }

  /**
   * Get cached file content from local storage
   */
  async getCachedFileContent(fileId: string): Promise<string | null> {
    try {
      return await fileSyncService.getCachedFile(fileId);
    } catch (error) {
      console.error('[WebFileFetcher] Error getting cached file:', error);
      return null;
    }
  }

  /**
   * Upload file from native app to web application
   */
  async uploadToWeb(
    filePath: string, 
    fileName: string, 
    fileType: string
  ): Promise<FileInfo> {
    try {
      return await fileSyncService.uploadFile(filePath, fileName, fileType);
    } catch (error) {
      console.error('[WebFileFetcher] Error uploading to web:', error);
      throw error;
    }
  }

  /**
   * Get file metadata from web app
   */
  async getWebFileMetadata(fileId: string): Promise<FileInfo | null> {
    try {
      return await fileSyncService.getFileMetadata(fileId);
    } catch (error) {
      console.error('[WebFileFetcher] Error getting file metadata:', error);
      return null;
    }
  }

  /**
   * Delete cached file from native storage
   */
  async deleteCachedFile(fileId: string): Promise<void> {
    try {
      await fileSyncService.deleteLocalFile(fileId);
      console.log(`[WebFileFetcher] Deleted cached file ${fileId}`);
    } catch (error) {
      console.error('[WebFileFetcher] Error deleting cached file:', error);
      throw error;
    }
  }

  /**
   * Sync all files from web app to native app
   */
  async syncAllFiles(): Promise<void> {
    try {
      await fileSyncService.syncFiles();
      console.log('[WebFileFetcher] Full sync completed');
    } catch (error) {
      console.error('[WebFileFetcher] Error during full sync:', error);
      throw error;
    }
  }

  /**
   * Get current sync progress
   */
  getSyncProgress(): SyncProgress {
    return { ...this.currentProgress };
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  /**
   * Add progress callback
   */
  onProgress(callback: (progress: SyncProgress) => void): void {
    this.onProgressCallbacks.push(callback);
  }

  /**
   * Remove progress callback
   */
  removeProgressCallback(callback: (progress: SyncProgress) => void): void {
    const index = this.onProgressCallbacks.indexOf(callback);
    if (index > -1) {
      this.onProgressCallbacks.splice(index, 1);
    }
  }

  /**
   * Start automatic sync with web app
   */
  startAutoSync(): void {
    fileSyncService.startAutoSync();
    console.log('[WebFileFetcher] Auto sync started');
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    fileSyncService.stopAutoSync();
    console.log('[WebFileFetcher] Auto sync stopped');
  }

  /**
   * Get available directories from web app
   */
  async getWebDirectories(): Promise<string[]> {
    try {
      // This would typically call a specific API endpoint
      // For now, we'll return some common directories
      return [
        'uploads/',
        'documents/',
        'images/',
        'assets/',
        'exports/',
        'reports/'
      ];
    } catch (error) {
      console.error('[WebFileFetcher] Error getting web directories:', error);
      return [];
    }
  }

  /**
   * Batch download files with progress tracking
   */
  async batchDownload(
    fileInfos: FileInfo[], 
    onProgress?: (completed: number, total: number, currentFile: string) => void
  ): Promise<{ success: FileInfo[], failed: FileInfo[] }> {
    const success: FileInfo[] = [];
    const failed: FileInfo[] = [];

    for (let i = 0; i < fileInfos.length; i++) {
      const fileInfo = fileInfos[i];
      
      if (onProgress) {
        onProgress(i, fileInfos.length, fileInfo.name);
      }
      
      try {
        await fileSyncService.downloadFile(fileInfo.id);
        success.push(fileInfo);
      } catch (error) {
        console.error(`[WebFileFetcher] Failed to download ${fileInfo.name}:`, error);
        failed.push(fileInfo);
      }
    }

    if (onProgress) {
      onProgress(fileInfos.length, fileInfos.length, '');
    }

    return { success, failed };
  }

  private notifyProgress(): void {
    const progress = { ...this.currentProgress };
    this.onProgressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('[WebFileFetcher] Error in progress callback:', error);
      }
    });
  }
}

// Export singleton instance
export const webFileFetcher = new WebFileFetcher();
export default WebFileFetcher;