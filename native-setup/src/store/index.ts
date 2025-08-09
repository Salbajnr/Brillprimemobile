// Redux store setup for React Native app
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';

// Import reducers
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import ordersReducer from './slices/ordersSlice';
import walletReducer from './slices/walletSlice';
import notificationsReducer from './slices/notificationsSlice';
import chatReducer from './slices/chatSlice';
import locationReducer from './slices/locationSlice';
import appReducer from './slices/appSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'user', 'app'], // Only persist these slices
  blacklist: ['orders', 'notifications', 'chat'], // Don't persist real-time data
};

// Root reducer
const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  orders: ordersReducer,
  wallet: walletReducer,
  notifications: notificationsReducer,
  chat: chatReducer,
  location: locationReducer,
  app: appReducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: __DEV__, // Enable Redux DevTools in development
});

// Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;