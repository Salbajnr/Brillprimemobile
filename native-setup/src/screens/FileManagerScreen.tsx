import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView
} from 'react-native';
import { webFileFetcher, type SyncProgress } from '../services/webFileFetcher';
import type { FileInfo } from '../services/fileSync';

const FileManagerScreen: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState<string>('uploads/');
  const [directories, setDirectories] = useState<string[]>([]);

  useEffect(() => {
    initializeFileManager();
    return () => {
      webFileFetcher.removeProgressCallback(handleSyncProgress);
    };
  }, []);

  const initializeFileManager = async () => {
    try {
      await webFileFetcher.initialize();
      webFileFetcher.onProgress(handleSyncProgress);
      await loadFiles();
      await loadDirectories();
    } catch (error) {
      console.error('Error initializing file manager:', error);
      Alert.alert('Error', 'Failed to initialize file manager');
    }
  };

  const handleSyncProgress = useCallback((progress: SyncProgress) => {
    setSyncProgress(progress);
    if (progress.progress === 100) {
      setShowSyncModal(false);
      loadFiles(); // Refresh file list after sync
    }
  }, []);

  const loadFiles = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const fileList = await webFileFetcher.fetchWebFiles({
        directory: selectedDirectory,
        maxFiles: 100
      });
      setFiles(fileList);
    } catch (error) {
      console.error('Error loading files:', error);
      Alert.alert('Error', 'Failed to load files from web app');
    } finally {
      setLoading(false);
    }
  };

  const loadDirectories = async () => {
    try {
      const dirs = await webFileFetcher.getWebDirectories();
      setDirectories(dirs);
    } catch (error) {
      console.error('Error loading directories:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  };

  const handleFilePress = (file: FileInfo) => {
    Alert.alert(
      file.name,
      `Size: ${formatFileSize(file.size)}\nType: ${file.type}\nLast Modified: ${new Date(file.lastModified).toLocaleDateString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', onPress: () => downloadFile(file) },
        { text: 'Get Info', onPress: () => showFileInfo(file) }
      ]
    );
  };

  const downloadFile = async (file: FileInfo) => {
    try {
      setShowSyncModal(true);
      await webFileFetcher.downloadFiles([file.id]);
      Alert.alert('Success', `${file.name} downloaded successfully`);
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setShowSyncModal(false);
    }
  };

  const showFileInfo = async (file: FileInfo) => {
    try {
      const metadata = await webFileFetcher.getWebFileMetadata(file.id);
      if (metadata) {
        Alert.alert(
          'File Information',
          `Name: ${metadata.name}\nSize: ${formatFileSize(metadata.size)}\nType: ${metadata.type}\nChecksum: ${metadata.checksum.substring(0, 8)}...\nLast Modified: ${new Date(metadata.lastModified).toLocaleString()}`
        );
      }
    } catch (error) {
      console.error('Error getting file info:', error);
      Alert.alert('Error', 'Failed to get file information');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadFiles();
      return;
    }

    setLoading(true);
    try {
      const searchResults = await webFileFetcher.searchWebFiles(searchQuery);
      setFiles(searchResults);
    } catch (error) {
      console.error('Error searching files:', error);
      Alert.alert('Error', 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setShowSyncModal(true);
      await webFileFetcher.syncAllFiles();
      Alert.alert('Success', 'All files synced successfully');
    } catch (error) {
      console.error('Error syncing files:', error);
      Alert.alert('Error', 'Sync failed');
    } finally {
      setShowSyncModal(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('text')) return '📝';
    if (fileType.includes('json') || fileType.includes('xml')) return '📋';
    return '📁';
  };

  const renderFile = ({ item }: { item: FileInfo }) => (
    <TouchableOpacity 
      style={styles.fileItem} 
      onPress={() => handleFilePress(item)}
    >
      <View style={styles.fileIconContainer}>
        <Text style={styles.fileIcon}>{getFileIcon(item.type)}</Text>
      </View>
      <View style={styles.fileDetails}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.fileSize}>
          {formatFileSize(item.size)} • {new Date(item.lastModified).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.downloadButton}
        onPress={() => downloadFile(item)}
      >
        <Text style={styles.downloadButtonText}>⬇️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderDirectorySelector = () => (
    <ScrollView 
      horizontal 
      style={styles.directorySelector}
      showsHorizontalScrollIndicator={false}
    >
      {directories.map((dir) => (
        <TouchableOpacity
          key={dir}
          style={[
            styles.directoryChip,
            selectedDirectory === dir && styles.selectedDirectoryChip
          ]}
          onPress={() => {
            setSelectedDirectory(dir);
            loadFiles();
          }}
        >
          <Text style={[
            styles.directoryChipText,
            selectedDirectory === dir && styles.selectedDirectoryChipText
          ]}>
            {dir.replace('/', '')}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>File Manager</Text>
        <TouchableOpacity style={styles.syncButton} onPress={handleSyncAll}>
          <Text style={styles.syncButtonText}>Sync All</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search files..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Directory Selector */}
      {renderDirectorySelector()}

      {/* File List */}
      <FlatList
        data={files}
        renderItem={renderFile}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#4682b4" />
            ) : (
              <>
                <Text style={styles.emptyText}>No files found</Text>
                <Text style={styles.emptySubtext}>
                  Pull down to refresh or try a different directory
                </Text>
              </>
            )}
          </View>
        }
        style={styles.fileList}
      />

      {/* Sync Progress Modal */}
      <Modal
        visible={showSyncModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Syncing Files</Text>
            {syncProgress && (
              <>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${syncProgress.progress}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {syncProgress.completed} of {syncProgress.total} files
                </Text>
                {syncProgress.currentFile && (
                  <Text style={styles.currentFileText}>
                    {syncProgress.currentFile}
                  </Text>
                )}
              </>
            )}
            <ActivityIndicator size="large" color="#4682b4" style={styles.loadingIndicator} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#4682b4',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  syncButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#4682b4',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
  },
  searchButton: {
    marginLeft: 12,
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4682b4',
    borderRadius: 8,
  },
  searchButtonText: {
    fontSize: 16,
  },
  directorySelector: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  directoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedDirectoryChip: {
    backgroundColor: '#4682b4',
    borderColor: '#4682b4',
  },
  directoryChipText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  selectedDirectoryChipText: {
    color: '#ffffff',
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginRight: 12,
  },
  fileIcon: {
    fontSize: 20,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#666666',
  },
  downloadButton: {
    padding: 8,
  },
  downloadButtonText: {
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    minWidth: 280,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333333',
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4682b4',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  currentFileText: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingIndicator: {
    marginTop: 8,
  },
});

export default FileManagerScreen;