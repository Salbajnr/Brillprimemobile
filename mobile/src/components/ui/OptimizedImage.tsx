
import React, { useState, useEffect } from 'react';
import { Image, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useDeviceInfo } from '../../hooks/useDeviceInfo';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  resizeMode = 'cover',
  placeholder,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { getOptimalImageSize, shouldReduceAnimations, performance } = useDeviceInfo();

  const getOptimizedSource = () => {
    if (typeof source === 'number') return source;

    const { width, height } = getOptimalImageSize();
    const quality = performance?.isLowPowerMode ? 60 : 80;
    
    // Add optimization parameters to URL
    const url = new URL(source.uri);
    url.searchParams.append('w', width.toString());
    url.searchParams.append('h', height.toString());
    url.searchParams.append('q', quality.toString());
    
    return { uri: url.toString() };
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          {/* Add error placeholder */}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={getOptimizedSource()}
        style={[StyleSheet.absoluteFill, style]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
      {isLoading && (
        <View style={styles.loadingContainer}>
          {placeholder || (
            <ActivityIndicator 
              size="small" 
              color="#4682b4"
              animating={!shouldReduceAnimations()}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});
