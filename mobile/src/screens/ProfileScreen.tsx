
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NavigationProps, MobileUser } from '../shared/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [user, setUser] = useState<MobileUser | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userSession = await AsyncStorage.getItem('userSession');
      if (userSession) {
        setUser(JSON.parse(userSession));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleAccountSettings = () => {
    navigation.navigate('AccountSettings');
  };

  const handleSupport = () => {
    navigation.navigate('Support');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('userSession');
            navigation.replace('SignIn');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={styles.nameText}>{user?.fullName || 'User'}</Text>
        <Text style={styles.emailText}>{user?.email || ''}</Text>
        <Text style={styles.roleText}>{user?.role || 'User'}</Text>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Email Address</Text>
          <Text style={styles.detailValue}>{user?.email || 'Not provided'}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Phone Number</Text>
          <Text style={styles.detailValue}>{user?.phone || 'Not provided'}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>User ID</Text>
          <Text style={styles.detailValue}>BP-{user?.id?.toString().padStart(6, '0') || '000000'}</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
          <Text style={styles.actionText}>✏️ Edit Profile</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleAccountSettings}>
          <Text style={styles.actionText}>⚙️ Account Settings</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleSupport}>
          <Text style={styles.actionText}>💬 Help & Support</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4682b4',
    padding: 30,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  nameText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  emailText: {
    color: '#e5f2ff',
    fontSize: 16,
    marginBottom: 5,
  },
  roleText: {
    color: '#e5f2ff',
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  detailsContainer: {
    padding: 20,
  },
  detailItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  actionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  actionArrow: {
    fontSize: 18,
    color: '#4682b4',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
});

export default ProfileScreen;
