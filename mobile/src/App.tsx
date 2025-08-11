
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { QueryClient, QueryClientProvider } from 'react-query';
import AppNavigator from './navigation/AppNavigator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeApp } from './utils/startup';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Animated.event now requires a second argument for options',
]);

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

const App: React.FC = () => {
  useEffect(() => {
    // Initialize app services
    initializeApp().catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />
        <AppNavigator />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
