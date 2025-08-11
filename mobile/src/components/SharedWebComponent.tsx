
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// This component demonstrates how to adapt web components for mobile
interface SharedWebComponentProps {
  title: string;
  content: string;
  webComponentData?: any;
}

const SharedWebComponent: React.FC<SharedWebComponentProps> = ({ 
  title, 
  content, 
  webComponentData 
}) => {
  // Adapt web component logic for mobile
  const adaptWebLogic = () => {
    // You can import and adapt logic from your web components here
    // For example, from client/src/components or client/src/pages
    return webComponentData;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.content}>{content}</Text>
      {/* Add mobile-specific UI elements here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default SharedWebComponent;
