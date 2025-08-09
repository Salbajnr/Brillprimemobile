
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../store/hooks';
import { setSelectedRole } from '../store/slices/authSlice';

interface Role {
  id: string;
  title: string;
  description: string;
  emoji: string;
  features: string[];
}

const roles: Role[] = [
  {
    id: 'CONSUMER',
    title: 'Consumer',
    description: 'Order fuel and buy commodities',
    emoji: '🛍️',
    features: ['Order fuel delivery', 'Buy commodities', 'Track orders', 'Secure payments'],
  },
  {
    id: 'MERCHANT',
    title: 'Merchant',
    description: 'Sell products and manage inventory',
    emoji: '🏪',
    features: ['Sell commodities', 'Manage inventory', 'Track sales', 'Customer management'],
  },
  {
    id: 'DRIVER',
    title: 'Driver',
    description: 'Deliver fuel and transport goods',
    emoji: '🚗',
    features: ['Deliver fuel', 'Transport goods', 'Earn money', 'Flexible schedule'],
  },
];

const RoleSelectionScreen: React.FC = () => {
  const [selectedRole, setSelectedRoleLocal] = useState<string>('');
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleLocal(roleId);
  };

  const handleContinue = () => {
    if (selectedRole) {
      dispatch(setSelectedRole(selectedRole as any));
      navigation.navigate('SignUp');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Choose Your Role</Text>
          <Text style={styles.headerSubtitle}>
            Select how you want to use BrillPrime
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.rolesContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleCard,
                selectedRole === role.id && styles.selectedRoleCard,
              ]}
              onPress={() => handleRoleSelect(role.id)}
            >
              <View style={styles.roleHeader}>
                <Text style={styles.roleEmoji}>{role.emoji}</Text>
                <View style={styles.roleTitleContainer}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.roleDescription}>{role.description}</Text>
                </View>
                {selectedRole === role.id && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.featuresContainer}>
                {role.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Text style={styles.featureBullet}>•</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          selectedRole ? styles.continueButtonActive : styles.continueButtonInactive,
        ]}
        onPress={handleContinue}
        disabled={!selectedRole}
      >
        <Text
          style={[
            styles.continueButtonText,
            selectedRole ? styles.continueButtonTextActive : styles.continueButtonTextInactive,
          ]}
        >
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  rolesContainer: {
    paddingHorizontal: 24,
  },
  roleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRoleCard: {
    borderColor: '#4682b4',
    backgroundColor: '#f0f8ff',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  roleTitleContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666666',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4682b4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  featuresContainer: {
    paddingLeft: 44,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureBullet: {
    fontSize: 16,
    color: '#4682b4',
    marginRight: 8,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 14,
    color: '#555555',
  },
  continueButton: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonActive: {
    backgroundColor: '#4682b4',
  },
  continueButtonInactive: {
    backgroundColor: '#e0e0e0',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  continueButtonTextActive: {
    color: '#ffffff',
  },
  continueButtonTextInactive: {
    color: '#999999',
  },
});

export default RoleSelectionScreen;
