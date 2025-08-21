
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { mobileBundleOptimizer } from './bundle-optimizer';

// Mobile-specific loading fallback
const MobileLoadingFallback = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4682b4" />
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

// Lazy load screen components
export const LazyDashboardScreen = React.lazy(() => 
  mobileBundleOptimizer.lazyLoadComponent(
    'DashboardScreen',
    () => import('../screens/DashboardScreen')
  )
);

export const LazyProfileScreen = React.lazy(() => 
  mobileBundleOptimizer.lazyLoadComponent(
    'ProfileScreen',
    () => import('../screens/ProfileScreen')
  )
);

export const LazyCartScreen = React.lazy(() => 
  mobileBundleOptimizer.lazyLoadComponent(
    'CartScreen',
    () => import('../screens/CartScreen')
  )
);

export const LazyOrderHistoryScreen = React.lazy(() => 
  mobileBundleOptimizer.lazyLoadComponent(
    'OrderHistoryScreen',
    () => import('../screens/OrderHistoryScreen')
  )
);

export const LazyMerchantDashboardScreen = React.lazy(() => 
  mobileBundleOptimizer.lazyLoadComponent(
    'MerchantDashboardScreen',
    () => import('../screens/MerchantDashboardScreen')
  )
);

export const LazyDriverDashboardScreen = React.lazy(() => 
  mobileBundleOptimizer.lazyLoadComponent(
    'DriverDashboardScreen',
    () => import('../screens/DriverDashboardScreen')
  )
);

// Wrap components with Suspense for mobile
export const withMobileSuspense = (Component: React.ComponentType) => {
  return (props: any) => (
    <React.Suspense fallback={<MobileLoadingFallback />}>
      <Component {...props} />
    </React.Suspense>
  );
};

// High-order component for performance optimization
export const withPerformanceOptimization = (Component: React.ComponentType) => {
  return React.memo((props: any) => {
    const { optimizeForDevice } = require('../hooks/usePerformance').usePerformance();
    const optimizations = optimizeForDevice();

    // Apply optimizations based on device performance
    const optimizedProps = {
      ...props,
      enableAnimations: optimizations.enableAnimations,
      useImagePlaceholders: optimizations.useImagePlaceholders,
      reducePolling: optimizations.reducePolling
    };

    return <Component {...optimizedProps} />;
  });
};

// Export combined optimized components
export const OptimizedDashboardScreen = withPerformanceOptimization(
  withMobileSuspense(LazyDashboardScreen)
);

export const OptimizedProfileScreen = withPerformanceOptimization(
  withMobileSuspense(LazyProfileScreen)
);

export const OptimizedCartScreen = withPerformanceOptimization(
  withMobileSuspense(LazyCartScreen)
);

export const OptimizedOrderHistoryScreen = withPerformanceOptimization(
  withMobileSuspense(LazyOrderHistoryScreen)
);

export const OptimizedMerchantDashboardScreen = withPerformanceOptimization(
  withMobileSuspense(LazyMerchantDashboardScreen)
);

export const OptimizedDriverDashboardScreen = withPerformanceOptimization(
  withMobileSuspense(LazyDriverDashboardScreen)
);
