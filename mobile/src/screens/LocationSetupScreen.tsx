
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

const LocationSetupScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [newLocationName, setNewLocationName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const presetLocations = [
    { name: 'Lagos Island', coordinates: { lat: 6.4541, lng: 3.3947 } },
    { name: 'Victoria Island', coordinates: { lat: 6.4281, lng: 3.4219 } },
    { name: 'Ikeja', coordinates: { lat: 6.5954, lng: 3.3379 } },
    { name: 'Surulere', coordinates: { lat: 6.4969, lng: 3.3538 } }
  ];

  const handleGetCurrentLocation = () => {
    Alert.alert(
      'Location Access',
      'This would normally access your device GPS to get current location',
      [{ text: 'OK' }]
    );
  };

  const handleSaveLocation = async () => {
    if (!newLocationName.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/api/user/save-location', {
        name: newLocationName,
        address: currentLocation
      });

      if (response.data.success) {
        setSavedLocations([...savedLocations, { name: newLocationName, address: currentLocation }]);
        setNewLocationName('');
        Alert.alert('Success', 'Location saved successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPresetLocation = (location: any) => {
    setCurrentLocation(location.name);
    Alert.alert('Location Set', `Current location set to ${location.name}`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Location Setup</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Location</Text>
        <TouchableOpacity style={styles.locationButton} onPress={handleGetCurrentLocation}>
          <Text style={styles.locationButtonText}>📍 Use Current Location</Text>
        </TouchableOpacity>
        {currentLocation && (
          <Text style={styles.currentLocationText}>Current: {currentLocation}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Locations</Text>
        {presetLocations.map((location, index) => (
          <TouchableOpacity
            key={index}
            style={styles.presetLocation}
            onPress={() => handleSelectPresetLocation(location)}
          >
            <Text style={styles.presetLocationText}>{location.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Save New Location</Text>
        <TextInput
          style={styles.input}
          value={newLocationName}
          onChangeText={setNewLocationName}
          placeholder="Enter location name (e.g., Home, Office)"
        />
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.disabledButton]} 
          onPress={handleSaveLocation}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Location'}
          </Text>
        </TouchableOpacity>
      </View>

      {savedLocations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Locations</Text>
          {savedLocations.map((location, index) => (
            <View key={index} style={styles.savedLocation}>
              <Text style={styles.savedLocationName}>{location.name}</Text>
              <Text style={styles.savedLocationAddress}>{location.address}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 16,
    color: '#007bff',
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  locationButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentLocationText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  presetLocation: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  presetLocationText: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  savedLocation: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  savedLocationName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  savedLocationAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default LocationSetupScreen;
