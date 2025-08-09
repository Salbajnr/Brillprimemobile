
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';

const FuelOrderingScreen = ({ navigation }: any) => {
  const [selectedFuelType, setSelectedFuelType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const fuelTypes = [
    { id: 'petrol', name: 'Premium Motor Spirit (PMS)', price: 617 },
    { id: 'diesel', name: 'Automotive Gas Oil (AGO)', price: 650 },
    { id: 'kerosene', name: 'Dual Purpose Kerosene (DPK)', price: 450 },
  ];

  const selectedFuel = fuelTypes.find(fuel => fuel.id === selectedFuelType);
  const totalAmount = selectedFuel ? selectedFuel.price * parseFloat(quantity || '0') : 0;

  const handlePlaceOrder = async () => {
    if (!selectedFuelType || !quantity || !location) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      // Simulate order placement
      Alert.alert(
        'Order Placed',
        `Your order for ${quantity}L of ${selectedFuel?.name} has been placed. Total: ₦${totalAmount.toFixed(2)}`,
        [{ text: 'OK', onPress: () => navigation.navigate('OrderHistory') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to place order');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Fuel</Text>
        <Text style={styles.subtitle}>Get fuel delivered to your location</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Select Fuel Type</Text>
        {fuelTypes.map((fuel) => (
          <TouchableOpacity
            key={fuel.id}
            style={[
              styles.fuelOption,
              selectedFuelType === fuel.id && styles.selectedFuel,
            ]}
            onPress={() => setSelectedFuelType(fuel.id)}
          >
            <View>
              <Text style={styles.fuelName}>{fuel.name}</Text>
              <Text style={styles.fuelPrice}>₦{fuel.price}/L</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Quantity (Liters)</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Enter quantity in liters"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Delivery Location</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Enter delivery address"
          multiline
        />

        {totalAmount > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <Text style={styles.summaryItem}>
              Fuel: {selectedFuel?.name}
            </Text>
            <Text style={styles.summaryItem}>
              Quantity: {quantity}L
            </Text>
            <Text style={styles.summaryItem}>
              Price per liter: ₦{selectedFuel?.price}
            </Text>
            <Text style={styles.summaryTotal}>
              Total: ₦{totalAmount.toFixed(2)}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.orderButton} onPress={handlePlaceOrder}>
          <Text style={styles.orderButtonText}>Place Order</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#2563eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  fuelOption: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  selectedFuel: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  fuelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  fuelPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  summary: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  summaryItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 10,
  },
  orderButton: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  orderButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FuelOrderingScreen;
