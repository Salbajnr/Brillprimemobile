
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

const FuelOrderingScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [selectedFuelType, setSelectedFuelType] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fuelTypes = [
    { id: 'petrol', name: 'Petrol (PMS)', price: 617 },
    { id: 'diesel', name: 'Diesel (AGO)', price: 750 },
    { id: 'kerosene', name: 'Kerosene (DPK)', price: 800 }
  ];

  const quantities = [5, 10, 20, 30, 50];

  const getTotalPrice = () => {
    const fuelType = fuelTypes.find(f => f.id === selectedFuelType);
    return fuelType ? fuelType.price * selectedQuantity : 0;
  };

  const handleOrderFuel = async () => {
    if (!selectedFuelType || !selectedQuantity) {
      Alert.alert('Error', 'Please select fuel type and quantity');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/api/fuel/order', {
        fuelType: selectedFuelType,
        quantity: selectedQuantity,
        totalAmount: getTotalPrice()
      });

      if (response.data.success) {
        Alert.alert('Success', 'Fuel order placed successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('TrackOrder', { orderId: response.data.orderId }) }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to place fuel order. Please try again.');
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
        <Text style={styles.title}>Order Fuel</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Fuel Type</Text>
        {fuelTypes.map((fuel) => (
          <TouchableOpacity
            key={fuel.id}
            style={[styles.optionButton, selectedFuelType === fuel.id && styles.selectedOption]}
            onPress={() => setSelectedFuelType(fuel.id)}
          >
            <Text style={[styles.optionText, selectedFuelType === fuel.id && styles.selectedOptionText]}>
              {fuel.name} - ₦{fuel.price}/liter
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Quantity (Liters)</Text>
        <View style={styles.quantityGrid}>
          {quantities.map((quantity) => (
            <TouchableOpacity
              key={quantity}
              style={[styles.quantityButton, selectedQuantity === quantity && styles.selectedQuantity]}
              onPress={() => setSelectedQuantity(quantity)}
            >
              <Text style={[styles.quantityText, selectedQuantity === quantity && styles.selectedQuantityText]}>
                {quantity}L
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {selectedFuelType && selectedQuantity > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <Text style={styles.summaryText}>
            Fuel: {fuelTypes.find(f => f.id === selectedFuelType)?.name}
          </Text>
          <Text style={styles.summaryText}>Quantity: {selectedQuantity} liters</Text>
          <Text style={styles.totalPrice}>Total: ₦{getTotalPrice().toLocaleString()}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.orderButton, loading && styles.disabledButton]} 
        onPress={handleOrderFuel}
        disabled={loading || !selectedFuelType || !selectedQuantity}
      >
        <Text style={styles.orderButtonText}>
          {loading ? 'Placing Order...' : 'Order Fuel'}
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
  },
  selectedOptionText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  quantityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quantityButton: {
    width: '30%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedQuantity: {
    borderColor: '#28a745',
    backgroundColor: '#e6f7e6',
  },
  quantityText: {
    fontSize: 14,
  },
  selectedQuantityText: {
    color: '#28a745',
    fontWeight: 'bold',
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
    color: '#28a745',
    marginTop: 8,
  },
  orderButton: {
    backgroundColor: '#ff6b35',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default FuelOrderingScreen;
