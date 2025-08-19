
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from 'react-native';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const title = type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info';
    Alert.alert(title, message);
  };

  const value = {
    showToast,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};
