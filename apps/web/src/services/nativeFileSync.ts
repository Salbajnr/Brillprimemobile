/**
 * Native File Sync Service for Web Application
 * Provides API endpoints and utilities for native app file synchronization
 */

import { apiService } from './apiService';

export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: number;
  checksum: string;
  url: string;
  isShared?: boolean;
  ownerId?: string;
}

export interface SyncManifest {
  version: string;
  timestamp: number;
  files: FileMetadata[];
  directories: string[];
  totalSize: number;
}

export interface SyncStatusResponse {
  isOnline: boolean;
  lastSync: number;
  pendingUploads: number;
  pendingDownloads: number;
  conflicts: number;
  totalFiles: number;
  syncEnabled: boolean;
}

class NativeFileSyncService {
  private syncInProgress = false;
  private lastSyncTime = 0;

  /**
   * Get sync manifest for native app
   */
  async getSyncManifest(
    directory: string = 'uploads/',
    includeMetadata: boolean = true
  ): Promise<SyncManifest> {
    try {
      const response = await apiService.get('/api/files/sync/manifest', {
        params: { directory, includeMetadata }
      });

      if (response.data.success) {
        return response.data.data.manifest;
      }

      throw new Error(response.data.message || 'Failed to get sync manifest');
    } catch (error: any) {
      console.error('Error getting sync manifest:', error);
      throw error;
    }
  }

  /**
   * Get file list for native app consumption
   */
  async getFileList(options: {
    directory?: string;
    fileTypes?: string[];
    modifiedAfter?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<FileMetadata[]> {
    try {
      const response = await apiService.get('/api/files/list', {
        params: {
          directory: options.directory || 'uploads/',
          fileTypes: options.fileTypes?.join(','),
          modifiedAfter: options.modifiedAfter?.toISOString(),
          limit: options.limit || 100,
          offset: options.offset || 0
        }
      });

      if (response.data.success) {
        return response.data.data.files || [];
      }

      throw new Error(response.data.message || 'Failed to get file list');
    } catch (error: any) {
      console.error('Error getting file list:', error);
      throw error;
    }
  }

  /**
   * Upload file for native app access
   */
  async uploadFileForSync(
    file: File,
    metadata: {
      directory?: string;
      isShared?: boolean;
      tags?: string[];
    } = {}
  ): Promise<FileMetadata> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('directory', metadata.directory || 'uploads/');
      formData.append('isShared', String(metadata.isShared || false));
      
      if (metadata.tags) {
        formData.append('tags', JSON.stringify(metadata.tags));
      }

      const response = await apiService.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
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
   * Create file download URL for native app
   */
  getFileDownloadUrl(fileId: string, filePath: string): string {
    const baseUrl = process.env.VITE_API_BASE_URL || '';
    return `${baseUrl}/api/files/download/${fileId}?path=${encodeURIComponent(filePath)}`;
  }

  /**
   * Generate sync token for native app authentication
   */
  async generateSyncToken(deviceId: string, expiresIn: number = 3600): Promise<string> {
    try {
      const response = await apiService.post('/api/files/sync/token', {
        deviceId,
        expiresIn
      });

      if (response.data.success) {
        return response.data.data.token;
      }

      throw new Error(response.data.message || 'Failed to generate sync token');
    } catch (error: any) {
      console.error('Error generating sync token:', error);
      throw error;
    }
  }

  /**
   * Get sync status for dashboard display
   */
  async getSyncStatus(): Promise<SyncStatusResponse> {
    try {
      const response = await apiService.get('/api/files/sync/status');

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to get sync status');
    } catch (error: any) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }

  /**
   * Search files with native app friendly results
   */
  async searchFiles(
    query: string,
    filters: {
      directory?: string;
      fileTypes?: string[];
      dateFrom?: Date;
      dateTo?: Date;
      tags?: string[];
      isShared?: boolean;
    } = {}
  ): Promise<FileMetadata[]> {
    try {
      const response = await apiService.get('/api/files/search', {
        params: {
          q: query,
          directory: filters.directory,
          type: filters.fileTypes?.join(','),
          dateFrom: filters.dateFrom?.toISOString(),
          dateTo: filters.dateTo?.toISOString(),
          tags: filters.tags?.join(','),
          isShared: filters.isShared
        }
      });

      if (response.data.success) {
        return response.data.data.files || [];
      }

      return [];
    } catch (error: any) {
      console.error('Error searching files:', error);
      return [];
    }
  }

  /**
   * Mark files as synchronized
   */
  async markAsSynced(fileIds: string[], deviceId: string): Promise<void> {
    try {
      const response = await apiService.post('/api/files/sync/mark-synced', {
        fileIds,
        deviceId,
        timestamp: Date.now()
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to mark files as synced');
      }
    } catch (error: any) {
      console.error('Error marking files as synced:', error);
      throw error;
    }
  }

  /**
   * Get file sharing configuration for native app
   */
  async getFileSharing(fileId: string): Promise<{
    isShared: boolean;
    shareUrl?: string;
    permissions: string[];
    expiresAt?: Date;
  }> {
    try {
      const response = await apiService.get(`/api/files/${fileId}/sharing`);

      if (response.data.success) {
        return response.data.data;
      }

      return {
        isShared: false,
        permissions: []
      };
    } catch (error: any) {
      console.error('Error getting file sharing:', error);
      return {
        isShared: false,
        permissions: []
      };
    }
  }

  /**
   * Create file share link for native app
   */
  async createShareLink(
    fileId: string,
    options: {
      expiresIn?: number;
      permissions?: ('read' | 'download')[];
      requireAuth?: boolean;
    } = {}
  ): Promise<string> {
    try {
      const response = await apiService.post(`/api/files/${fileId}/share`, {
        expiresIn: options.expiresIn || 3600,
        permissions: options.permissions || ['read', 'download'],
        requireAuth: options.requireAuth || false
      });

      if (response.data.success) {
        return response.data.data.shareUrl;
      }

      throw new Error(response.data.message || 'Failed to create share link');
    } catch (error: any) {
      console.error('Error creating share link:', error);
      throw error;
    }
  }

  /**
   * Get sync statistics for analytics
   */
  async getSyncStats(period: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalSyncs: number;
    totalFiles: number;
    totalSize: number;
    averageSyncTime: number;
    errorRate: number;
    deviceCount: number;
  }> {
    try {
      const response = await apiService.get('/api/files/sync/stats', {
        params: { period }
      });

      if (response.data.success) {
        return response.data.data;
      }

      return {
        totalSyncs: 0,
        totalFiles: 0,
        totalSize: 0,
        averageSyncTime: 0,
        errorRate: 0,
        deviceCount: 0
      };
    } catch (error: any) {
      console.error('Error getting sync stats:', error);
      return {
        totalSyncs: 0,
        totalFiles: 0,
        totalSize: 0,
        averageSyncTime: 0,
        errorRate: 0,
        deviceCount: 0
      };
    }
  }

  /**
   * Bulk file operations for native sync
   */
  async bulkFileOperations(operations: Array<{
    type: 'download' | 'delete' | 'move' | 'copy';
    fileId: string;
    targetPath?: string;
  }>): Promise<{
    success: string[];
    failed: Array<{ fileId: string; error: string }>;
  }> {
    try {
      const response = await apiService.post('/api/files/bulk-operations', {
        operations
      });

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Bulk operations failed');
    } catch (error: any) {
      console.error('Error performing bulk operations:', error);
      throw error;
    }
  }

  /**
   * Validate file integrity for sync
   */
  async validateFileIntegrity(fileId: string, checksum: string): Promise<boolean> {
    try {
      const response = await apiService.post('/api/files/validate', {
        fileId,
        checksum
      });

      if (response.data.success) {
        return response.data.data.isValid;
      }

      return false;
    } catch (error: any) {
      console.error('Error validating file integrity:', error);
      return false;
    }
  }

  /**
   * Get available storage space for sync
   */
  async getStorageInfo(): Promise<{
    total: number;
    used: number;
    available: number;
    quota: number;
  }> {
    try {
      const response = await apiService.get('/api/files/storage-info');

      if (response.data.success) {
        return response.data.data;
      }

      return {
        total: 0,
        used: 0,
        available: 0,
        quota: 0
      };
    } catch (error: any) {
      console.error('Error getting storage info:', error);
      return {
        total: 0,
        used: 0,
        available: 0,
        quota: 0
      };
    }
  }

  /**
   * Configure sync settings
   */
  async updateSyncSettings(settings: {
    autoSync?: boolean;
    syncInterval?: number;
    syncOnWifiOnly?: boolean;
    maxFileSize?: number;
    excludeFileTypes?: string[];
  }): Promise<void> {
    try {
      const response = await apiService.put('/api/files/sync/settings', settings);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update sync settings');
      }
    } catch (error: any) {
      console.error('Error updating sync settings:', error);
      throw error;
    }
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * Force refresh sync manifest
   */
  async refreshSyncManifest(directory?: string): Promise<SyncManifest> {
    try {
      const response = await apiService.post('/api/files/sync/refresh', {
        directory: directory || 'uploads/'
      });

      if (response.data.success) {
        return response.data.data.manifest;
      }

      throw new Error(response.data.message || 'Failed to refresh sync manifest');
    } catch (error: any) {
      console.error('Error refreshing sync manifest:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const nativeFileSyncService = new NativeFileSyncService();
export default NativeFileSyncService;