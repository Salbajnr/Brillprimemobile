
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import AppWrapper from './components/AppWrapper';
import { initializeApp } from './utils/startup';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Animated.event now requires a second argument for options',
  'Warning: componentWillReceiveProps has been renamed',
]);

const App: React.FC = () => {
  useEffect(() => {
    // Initialize app services
    initializeApp().catch(console.error);
  }, []);

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <AppWrapper />
    </>
  );
};

export default App;
