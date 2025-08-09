
/**
 * Native File Sync Service for Web Application
 * Provides API endpoints and utilities for native app file synchronization
 */

import { ApiService } from './apiService';

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

export class NativeFileSyncService {
  private apiService: ApiService;

  constructor(apiService: ApiService) {
    this.apiService = apiService;
  }

  /**
   * Get sync manifest for native app
   */
  async getSyncManifest(lastSyncTime?: number): Promise<SyncManifest> {
    try {
      const params = lastSyncTime ? { lastSync: lastSyncTime.toString() } : {};
      const response = await this.apiService.get('/api/files/sync/manifest', { params });

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to get sync manifest');
    } catch (error: any) {
      console.error('Error getting sync manifest:', error);
      throw error;
    }
  }

  /**
   * Get list of files for native app synchronization
   */
  async getFileList(directory?: string): Promise<FileMetadata[]> {
    try {
      const params = directory ? { directory } : {};
      const response = await this.apiService.get('/api/files/list', { params });

      if (response.data.success) {
        return response.data.data.files;
      }

      throw new Error(response.data.message || 'Failed to get file list');
    } catch (error: any) {
      console.error('Error getting file list:', error);
      throw error;
    }
  }

  /**
   * Download file content for native app
   */
  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    try {
      const response = await this.apiService.get(`/api/files/download/${fileId}`, {
        responseType: 'arraybuffer'
      });

      return response.data;
    } catch (error: any) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Upload file from native app
   */
  async uploadFile(
    file: File | Blob,
    filename: string,
    directory?: string
  ): Promise<FileMetadata> {
    try {
      const formData = new FormData();
      formData.append('file', file, filename);
      if (directory) {
        formData.append('directory', directory);
      }

      const response = await this.apiService.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to upload file');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    try {
      const response = await this.apiService.get(`/api/files/metadata/${fileId}`);

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to get file metadata');
    } catch (error: any) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Search files for native app
   */
  async searchFiles(
    query: string,
    options: {
      directory?: string;
      fileTypes?: string[];
      dateFrom?: Date;
      dateTo?: Date;
      maxResults?: number;
    } = {}
  ): Promise<FileMetadata[]> {
    try {
      const params: any = { q: query };
      
      if (options.directory) params.directory = options.directory;
      if (options.fileTypes) params.fileTypes = options.fileTypes.join(',');
      if (options.dateFrom) params.dateFrom = options.dateFrom.toISOString();
      if (options.dateTo) params.dateTo = options.dateTo.toISOString();
      if (options.maxResults) params.maxResults = options.maxResults.toString();

      const response = await this.apiService.get('/api/files/search', { params });

      if (response.data.success) {
        return response.data.data.files;
      }

      throw new Error(response.data.message || 'Failed to search files');
    } catch (error: any) {
      console.error('Error searching files:', error);
      throw error;
    }
  }

  /**
   * Get sync status for native app
   */
  async getSyncStatus(): Promise<SyncStatusResponse> {
    try {
      const response = await this.apiService.get('/api/files/sync/status');

      if (response.data.success) {
        return response.data.data;
      }

      return {
        isOnline: false,
        lastSync: 0,
        pendingUploads: 0,
        pendingDownloads: 0,
        conflicts: 0,
        totalFiles: 0,
        syncEnabled: false
      };
    } catch (error: any) {
      console.error('Error getting sync status:', error);
      return {
        isOnline: false,
        lastSync: 0,
        pendingUploads: 0,
        pendingDownloads: 0,
        conflicts: 0,
        totalFiles: 0,
        syncEnabled: false
      };
    }
  }

  /**
   * Delete file (native app request)
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const response = await this.apiService.delete(`/api/files/${fileId}`);

      if (response.data.success) {
        return true;
      }

      throw new Error(response.data.message || 'Failed to delete file');
    } catch (error: any) {
      console.error('Error deleting file:', error);
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
      const response = await this.apiService.get(`/api/files/${fileId}/sharing`);

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
      const response = await this.apiService.post(`/api/files/${fileId}/share`, {
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
}
