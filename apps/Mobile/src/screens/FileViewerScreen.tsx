
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { webFileFetcher, type FileInfo } from '../services/webFileFetcher';

interface FileViewerScreenProps {
  navigation: any;
  route: {
    params: {
      file: FileInfo;
      content?: string;
    };
  };
}

export const FileViewerScreen: React.FC<FileViewerScreenProps> = ({ navigation, route }) => {
  const { file, content: initialContent } = route.params;
  const [content, setContent] = useState<string | null>(initialContent || null);
  const [loading, setLoading] = useState(!initialContent);
  const [error, setError] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    navigation.setOptions({
      title: file.name,
    });

    if (!initialContent) {
      loadFileContent();
    }
  }, [file, initialContent, navigation]);

  const loadFileContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const cachedContent = await webFileFetcher.getCachedFileContent(file.id);
      
      if (cachedContent) {
        setContent(cachedContent);
      } else {
        // File not cached, offer to download
        Alert.alert(
          'File Not Cached',
          'This file is not available offline. Would you like to download it?',
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Download', onPress: downloadAndOpen },
          ]
        );
      }
    } catch (err) {
      console.error('Error loading file content:', err);
      setError('Failed to load file content');
    } finally {
      setLoading(false);
    }
  };

  const downloadAndOpen = async () => {
    try {
      setLoading(true);
      const result = await webFileFetcher.downloadFiles([file.id]);
      
      if (result.success.length > 0) {
        const downloadedContent = await webFileFetcher.getCachedFileContent(file.id);
        setContent(downloadedContent);
      } else {
        setError('Failed to download file');
      }
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  const shareFile = async () => {
    try {
      // In a real React Native app, you would use react-native-share
      Alert.alert('Share File', `Sharing "${file.name}" would be implemented here`);
    } catch (err) {
      console.error('Error sharing file:', err);
      Alert.alert('Error', 'Failed to share file');
    }
  };

  const deleteFile = async () => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.name}" from local cache?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await webFileFetcher.deleteCachedFile(file.id);
              Alert.alert('Success', 'File deleted from cache');
              navigation.goBack();
            } catch (err) {
              console.error('Error deleting file:', err);
              Alert.alert('Error', 'Failed to delete file');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = () => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    return type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => name.endsWith(ext));
  };

  const isText = () => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    return type.includes('text') || ['.txt', '.md', '.json', '.csv'].some(ext => name.endsWith(ext));
  };

  const renderFileContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading file...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFileContent}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!content) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No content available</Text>
        </View>
      );
    }

    if (isImage()) {
      // For images, content would be base64 data
      return (
        <ScrollView 
          style={styles.imageContainer}
          contentContainerStyle={styles.imageContentContainer}
          maximumZoomScale={3}
          minimumZoomScale={1}
        >
          <Image
            source={{ uri: `data:${file.type};base64,${content}` }}
            style={[styles.image, { width: screenWidth - 32 }]}
            resizeMode="contain"
          />
        </ScrollView>
      );
    }

    if (isText()) {
      // Decode base64 content for text files
      try {
        const textContent = atob(content);
        return (
          <ScrollView style={styles.textContainer}>
            <Text style={styles.textContent}>{textContent}</Text>
          </ScrollView>
        );
      } catch (err) {
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Failed to decode text content</Text>
          </View>
        );
      }
    }

    // For other file types, show file info
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.fileTypeText}>📁</Text>
        <Text style={styles.fileInfoText}>
          This file type cannot be previewed in the app.
        </Text>
        <Text style={styles.fileInfoSubtext}>
          You can share or download it to view in another app.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* File Info Header */}
      <View style={styles.fileInfoHeader}>
        <View style={styles.fileInfoRow}>
          <Text style={styles.fileInfoLabel}>Size:</Text>
          <Text style={styles.fileInfoValue}>{formatFileSize(file.size)}</Text>
        </View>
        <View style={styles.fileInfoRow}>
          <Text style={styles.fileInfoLabel}>Type:</Text>
          <Text style={styles.fileInfoValue}>{file.type}</Text>
        </View>
        <View style={styles.fileInfoRow}>
          <Text style={styles.fileInfoLabel}>Modified:</Text>
          <Text style={styles.fileInfoValue}>
            {new Date(file.lastModified).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* File Content */}
      <View style={styles.contentContainer}>
        {renderFileContent()}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={shareFile}>
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={deleteFile}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fileInfoHeader: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  fileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  fileInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  fileInfoValue: {
    fontSize: 14,
    color: '#333',
  },
  contentContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
  },
  imageContentContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  image: {
    height: 300,
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
    padding: 16,
  },
  textContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    fontFamily: 'monospace',
  },
  fileTypeText: {
    fontSize: 64,
    marginBottom: 16,
  },
  fileInfoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  fileInfoSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
