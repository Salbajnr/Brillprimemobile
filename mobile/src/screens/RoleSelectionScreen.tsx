
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Role {
  id: string;
  title: string;
  description: string;
  features: string[];
}

const RoleSelectionScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const roles: Role[] = [
    {
      id: 'CONSUMER',
      title: 'Consumer',
      description: 'Order products and services',
      features: [
        'Order food, groceries, and more',
        'Track deliveries in real-time',
        'Pay bills and transfer money',
        'Fuel ordering and toll payments'
      ]
    },
    {
      id: 'DRIVER',
      title: 'Driver',
      description: 'Deliver orders and earn money',
      features: [
        'Accept delivery requests',
        'Earn money from deliveries',
        'Track earnings and performance',
        'Flexible working hours'
      ]
    },
    {
      id: 'MERCHANT',
      title: 'Merchant',
      description: 'Sell products and manage your business',
      features: [
        'List and manage products',
        'Process customer orders',
        'Track sales and analytics',
        'Manage inventory and pricing'
      ]
    }
  ];

  const handleRoleSelection = (roleId: string) => {
    setSelectedRole(roleId);
  };

  const handleContinue = async () => {
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role to continue');
      return;
    }

    setLoading(true);
    try {
      // Save selected role to local storage
      await AsyncStorage.setItem('selectedRole', selectedRole);
      
      // Navigate to appropriate screen based on role
      if (selectedRole === 'DRIVER') {
        navigation.navigate('DriverRegistration');
      } else if (selectedRole === 'MERCHANT') {
        navigation.navigate('MerchantRegistration');
      } else {
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      Alert.alert('Error', 'Failed to save role selection');
    } finally {
      setLoading(false);
    }
  };

  const RoleCard: React.FC<{ role: Role }> = ({ role }) => (
    <TouchableOpacity
      style={[
        styles.roleCard,
        selectedRole === role.id && styles.selectedRoleCard
      ]}
      onPress={() => handleRoleSelection(role.id)}
    >
      <View style={styles.roleHeader}>
        <Text style={[
          styles.roleTitle,
          selectedRole === role.id && styles.selectedRoleTitle
        ]}>
          {role.title}
        </Text>
        <View style={[
          styles.radioButton,
          selectedRole === role.id && styles.selectedRadioButton
        ]}>
          {selectedRole === role.id && <View style={styles.radioButtonInner} />}
        </View>
      </View>
      
      <Text style={styles.roleDescription}>{role.description}</Text>
      
      <View style={styles.featuresContainer}>
        {role.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Role</Text>
        <Text style={styles.headerSubtitle}>
          Select how you want to use BrillPrime
        </Text>
      </View>

      <ScrollView style={styles.rolesContainer} showsVerticalScrollIndicator={false}>
        {roles.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedRole && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={!selectedRole || loading}
        >
          <Text style={[
            styles.continueButtonText,
            !selectedRole && styles.disabledButtonText
          ]}>
            {loading ? 'Please wait...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  rolesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  roleCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedRoleCard: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4682b4',
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedRoleTitle: {
    color: '#4682b4',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadioButton: {
    borderColor: '#4682b4',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4682b4',
  },
  roleDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  featuresContainer: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  featureBullet: {
    fontSize: 16,
    color: '#4682b4',
    marginRight: 8,
    marginTop: 2,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#4682b4',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#999',
  },
});

export default RoleSelectionScreen;
