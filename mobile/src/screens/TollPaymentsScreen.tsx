
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

const TollPaymentsScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [selectedTollGate, setSelectedTollGate] = useState<string>('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const tollGates = [
    { id: 'lekki', name: 'Lekki Toll Gate', location: 'Lagos' },
    { id: 'berger', name: 'Berger Toll Gate', location: 'Lagos' },
    { id: 'kara', name: 'Kara Bridge Toll', location: 'Ogun' },
    { id: 'otedola', name: 'Otedola Bridge Toll', location: 'Lagos' }
  ];

  const vehicleTypes = [
    { id: 'car', name: 'Car/SUV', price: 250 },
    { id: 'bus', name: 'Mini Bus', price: 300 },
    { id: 'truck', name: 'Truck', price: 500 },
    { id: 'trailer', name: 'Trailer', price: 800 }
  ];

  const getTollPrice = () => {
    const vehicle = vehicleTypes.find(v => v.id === selectedVehicleType);
    return vehicle ? vehicle.price : 0;
  };

  const handlePayToll = async () => {
    if (!selectedTollGate || !selectedVehicleType) {
      Alert.alert('Error', 'Please select toll gate and vehicle type');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/api/toll/pay', {
        tollGateId: selectedTollGate,
        vehicleType: selectedVehicleType,
        amount: getTollPrice()
      });

      if (response.data.success) {
        Alert.alert('Success', 'Toll payment successful!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pay Toll</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Toll Gate</Text>
        {tollGates.map((gate) => (
          <TouchableOpacity
            key={gate.id}
            style={[styles.optionButton, selectedTollGate === gate.id && styles.selectedOption]}
            onPress={() => setSelectedTollGate(gate.id)}
          >
            <Text style={[styles.optionText, selectedTollGate === gate.id && styles.selectedOptionText]}>
              {gate.name}
            </Text>
            <Text style={styles.locationText}>{gate.location}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Vehicle Type</Text>
        {vehicleTypes.map((vehicle) => (
          <TouchableOpacity
            key={vehicle.id}
            style={[styles.optionButton, selectedVehicleType === vehicle.id && styles.selectedOption]}
            onPress={() => setSelectedVehicleType(vehicle.id)}
          >
            <View style={styles.vehicleOption}>
              <Text style={[styles.optionText, selectedVehicleType === vehicle.id && styles.selectedOptionText]}>
                {vehicle.name}
              </Text>
              <Text style={styles.priceText}>₦{vehicle.price}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTollGate && selectedVehicleType && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <Text style={styles.summaryText}>
            Toll Gate: {tollGates.find(g => g.id === selectedTollGate)?.name}
          </Text>
          <Text style={styles.summaryText}>
            Vehicle: {vehicleTypes.find(v => v.id === selectedVehicleType)?.name}
          </Text>
          <Text style={styles.totalPrice}>Amount: ₦{getTollPrice()}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.payButton, loading && styles.disabledButton]} 
        onPress={handlePayToll}
        disabled={loading || !selectedTollGate || !selectedVehicleType}
      >
        <Text style={styles.payButtonText}>
          {loading ? 'Processing Payment...' : `Pay ₦${getTollPrice()}`}
        </Text>
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
  optionButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedOption: {
    borderColor: '#007bff',
    backgroundColor: '#e6f3ff',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  vehicleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  summary: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    marginTop: 8,
  },
  payButton: {
    backgroundColor: '#007bff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default TollPaymentsScreen;
