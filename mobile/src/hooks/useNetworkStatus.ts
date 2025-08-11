
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  });

  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    // In a real React Native app, you would use @react-native-community/netinfo
    // For now, we'll simulate network status
    const checkNetworkStatus = () => {
      const isOnline = navigator.onLine;
      setNetworkStatus({
        isConnected: isOnline,
        isInternetReachable: isOnline,
        type: isOnline ? 'wifi' : null,
      });

      // Show alert when going offline
      if (!isOnline && !showOfflineAlert) {
        setShowOfflineAlert(true);
        Alert.alert(
          'No Internet Connection',
          'Please check your internet connection and try again.',
          [
            {
              text: 'OK',
              onPress: () => setShowOfflineAlert(false),
            },
          ]
        );
      }
    };

    // Check initially
    checkNetworkStatus();

    // Listen for network changes
    window.addEventListener('online', checkNetworkStatus);
    window.addEventListener('offline', checkNetworkStatus);

    // Cleanup
    return () => {
      window.removeEventListener('online', checkNetworkStatus);
      window.removeEventListener('offline', checkNetworkStatus);
    };
  }, [showOfflineAlert]);

  return networkStatus;
};

export default useNetworkStatus;
