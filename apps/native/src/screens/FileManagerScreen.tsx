
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { webFileFetcher, type FileInfo, type SyncProgress } from '../services/webFileFetcher';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateSyncStatus } from '../store/slices/appSlice';

interface FileManagerScreenProps {
  navigation: any;
}

export const FileManagerScreen: React.FC<FileManagerScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const syncStatus = useAppSelector(state => state.app.syncStatus);
  
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState<FileInfo[]>([]);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [filterType, setFilterType] = useState<'all' | 'images' | 'documents' | 'others'>('all');

  useEffect(() => {
    initializeFileManager();
    setupProgressTracking();
    
    return () => {
      webFileFetcher.removeProgressCallback(handleSyncProgress);
    };
  }, []);

  useEffect(() => {
    filterAndSortFiles();
  }, [files, searchQuery, sortBy, filterType]);

  const initializeFileManager = async () => {
    try {
      setLoading(true);
      await webFileFetcher.initialize();
      await loadFiles();
    } catch (error) {
      console.error('Failed to initialize file manager:', error);
      Alert.alert('Error', 'Failed to initialize file manager');
    } finally {
      setLoading(false);
    }
  };

  const setupProgressTracking = () => {
    webFileFetcher.onProgress(handleSyncProgress);
  };

  const handleSyncProgress = useCallback((progress: SyncProgress) => {
    setSyncProgress(progress);
    dispatch(updateSyncStatus({
      isOnline: true,
      lastSyncTime: Date.now(),
      syncInProgress: progress.progress < 100,
    }));
  }, [dispatch]);

  const loadFiles = async () => {
    try {
      const fetchedFiles = await webFileFetcher.fetchWebFiles({
        directory: 'uploads/',
        includeHidden: false,
        maxFiles: 1000,
      });
      setFiles(fetchedFiles);
    } catch (error) {
      console.error('Failed to load files:', error);
      Alert.alert('Error', 'Failed to load files from server');
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFiles();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filterAndSortFiles = () => {
    let filtered = files;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(file => {
        const type = file.type.toLowerCase();
        switch (filterType) {
          case 'images':
            return type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => file.name.toLowerCase().endsWith(ext));
          case 'documents':
            return ['.pdf', '.doc', '.docx', '.txt', '.rtf'].some(ext => file.name.toLowerCase().endsWith(ext));
          case 'others':
            return !type.includes('image') && !['.pdf', '.doc', '.docx', '.txt', '.rtf'].some(ext => file.name.toLowerCase().endsWith(ext));
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'date':
        default:
          return b.lastModified - a.lastModified;
      }
    });

    setFilteredFiles(filtered);
  };

  const handleFilePress = async (file: FileInfo) => {
    if (selectionMode) {
      toggleFileSelection(file.id);
      return;
    }

    try {
      // Try to get cached version first
      const cachedContent = await webFileFetcher.getCachedFileContent(file.id);
      
      if (cachedContent) {
        // Open cached file
        openFile(file, cachedContent);
      } else {
        // Download and cache file
        Alert.alert(
          'Download File',
          `File "${file.name}" is not cached. Download it now?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Download', onPress: () => downloadFile(file) },
          ]
        );
      }
    } catch (error) {
      console.error('Error accessing file:', error);
      Alert.alert('Error', 'Failed to access file');
    }
  };

  const downloadFile = async (file: FileInfo) => {
    try {
      setLoading(true);
      const result = await webFileFetcher.downloadFiles([file.id]);
      
      if (result.success.length > 0) {
        Alert.alert('Success', `Downloaded "${file.name}" successfully`);
        // Optionally refresh the list to update cached status
        await loadFiles();
      } else {
        Alert.alert('Error', `Failed to download "${file.name}"`);
      }
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert('Error', 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  const openFile = (file: FileInfo, content: string) => {
    // Navigate to file viewer or handle file opening
    navigation.navigate('FileViewer', { file, content });
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const handleBatchDownload = async () => {
    if (selectedFiles.size === 0) return;

    try {
      setLoading(true);
      const fileIds = Array.from(selectedFiles);
      const result = await webFileFetcher.downloadFiles(fileIds);
      
      Alert.alert(
        'Download Complete',
        `Downloaded ${result.success.length} files successfully. ${result.failed.length} failed.`
      );
      
      setSelectedFiles(new Set());
      setSelectionMode(false);
      await loadFiles();
    } catch (error) {
      console.error('Batch download failed:', error);
      Alert.alert('Error', 'Batch download failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setLoading(true);
      await webFileFetcher.syncAllFiles();
      Alert.alert('Success', 'All files synced successfully');
      await loadFiles();
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Error', 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getFileIcon = (file: FileInfo) => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    
    if (type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => name.endsWith(ext))) {
      return '🖼️';
    } else if (['.pdf'].some(ext => name.endsWith(ext))) {
      return '📄';
    } else if (['.doc', '.docx'].some(ext => name.endsWith(ext))) {
      return '📝';
    } else if (['.txt', '.rtf'].some(ext => name.endsWith(ext))) {
      return '📃';
    } else if (['.mp4', '.avi', '.mov'].some(ext => name.endsWith(ext))) {
      return '🎥';
    } else if (['.mp3', '.wav', '.aac'].some(ext => name.endsWith(ext))) {
      return '🎵';
    }
    return '📁';
  };

  const renderFileItem = ({ item }: { item: FileInfo }) => (
    <TouchableOpacity
      style={[
        styles.fileItem,
        selectedFiles.has(item.id) && styles.selectedFileItem
      ]}
      onPress={() => handleFilePress(item)}
      onLongPress={() => {
        setSelectionMode(true);
        toggleFileSelection(item.id);
      }}
    >
      <View style={styles.fileIcon}>
        <Text style={styles.fileIconText}>{getFileIcon(item)}</Text>
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.fileDetails}>
          {formatFileSize(item.size)} • {formatDate(item.lastModified)}
        </Text>
      </View>
      {selectionMode && (
        <View style={styles.checkbox}>
          <Text>{selectedFiles.has(item.id) ? '✓' : '○'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>File Manager</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleSyncAll} style={styles.syncButton}>
            <Text style={styles.syncButtonText}>Sync All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search files..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Controls */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {['all', 'images', 'documents', 'others'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                filterType === type && styles.activeFilterButton
              ]}
              onPress={() => setFilterType(type as any)}
            >
              <Text style={[
                styles.filterButtonText,
                filterType === type && styles.activeFilterButtonText
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Selection Mode Actions */}
      {selectionMode && (
        <View style={styles.selectionActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleBatchDownload}
          >
            <Text style={styles.actionButtonText}>
              Download Selected ({selectedFiles.size})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => {
              setSelectionMode(false);
              setSelectedFiles(new Set());
            }}
          >
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sync Progress */}
      {syncProgress && syncProgress.progress < 100 && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Syncing: {syncProgress.completed}/{syncProgress.total} files
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${syncProgress.progress}%` }]} 
            />
          </View>
        </View>
      )}

      {/* File List */}
      <FlatList
        data={filteredFiles}
        renderItem={renderFileItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        style={styles.fileList}
        contentContainerStyle={styles.fileListContent}
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
  },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  activeFilterButtonText: {
    color: 'white',
  },
  selectionActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e8f4fd',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff3cd',
  },
  progressText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#ffeaa7',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fdcb6e',
    borderRadius: 2,
  },
  fileList: {
    flex: 1,
  },
  fileListContent: {
    paddingVertical: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedFileItem: {
    backgroundColor: '#e8f4fd',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  fileIcon: {
    marginRight: 12,
  },
  fileIconText: {
    fontSize: 24,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  fileDetails: {
    fontSize: 12,
    color: '#666',
  },
  checkbox: {
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 8,
    fontSize: 16,
  },
});
