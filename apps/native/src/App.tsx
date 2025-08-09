
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store, persistor } from './store';
import AppNavigator from './navigation/AppNavigator';
import { LoadingScreen } from './components/LoadingScreen';

// Ignore specific warnings for development
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested',
  'Setting a timer',
]);

const App: React.FC = () => {
  useEffect(() => {
    // Initialize app services here
    console.log('BrillPrime Native App Started');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={<LoadingScreen />} persistor={persistor}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <AppNavigator />
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
