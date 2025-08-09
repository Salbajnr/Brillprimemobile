import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const RoleSelectionScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleRoleSelect = (role: string) => {
    // Store role selection and navigate to sign up
    navigation.navigate('SignUp' as never, { role });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Role</Text>
      <Text style={styles.subtitle}>How will you be using BrillPrime?</Text>
      
      <TouchableOpacity 
        style={styles.roleButton} 
        onPress={() => handleRoleSelect('CONSUMER')}
      >
        <Text style={styles.roleTitle}>Consumer</Text>
        <Text style={styles.roleDescription}>
          Shop, order, and pay for products and services
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.roleButton} 
        onPress={() => handleRoleSelect('MERCHANT')}
      >
        <Text style={styles.roleTitle}>Merchant</Text>
        <Text style={styles.roleDescription}>
          Sell products and manage your business
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.roleButton} 
        onPress={() => handleRoleSelect('DRIVER')}
      >
        <Text style={styles.roleTitle}>Driver</Text>
        <Text style={styles.roleDescription}>
          Deliver orders and earn money
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 40,
  },
  roleButton: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4682b4',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});

export default RoleSelectionScreen;