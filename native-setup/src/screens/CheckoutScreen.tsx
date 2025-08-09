
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useAppSelector } from '../store/hooks';
import { api } from '../services/api';

interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet' | 'bank';
  name: string;
  details: string;
}

export default function CheckoutScreen({ route, navigation }: any) {
  const { cartItems, total } = route.params;
  const { user } = useAppSelector((state) => state.auth);
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'wallet',
      type: 'wallet',
      name: 'BrillPrime Wallet',
      details: 'Pay using your wallet balance'
    },
    {
      id: 'card',
      type: 'card',
      name: 'Debit/Credit Card',
      details: 'Pay with Paystack'
    },
    {
      id: 'bank',
      type: 'bank',
      name: 'Bank Transfer',
      details: 'Direct bank transfer'
    }
  ];

  const processOrder = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method');
      return;
    }

    if (!deliveryAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your delivery address');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Phone Required', 'Please enter your phone number');
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        userId: user?.id,
        items: cartItems,
        totalAmount: total,
        paymentMethod: selectedPaymentMethod,
        deliveryAddress: deliveryAddress.trim(),
        phoneNumber: phoneNumber.trim(),
        notes: notes.trim(),
        status: 'pending'
      };

      const response = await api.post('/orders', orderData);

      if (response.data.success) {
        // Clear cart after successful order
        await api.delete(`/cart/clear/${user?.id}`);
        
        Alert.alert(
          'Order Placed Successfully!',
          'Your order has been placed and is being processed.',
          [
            {
              text: 'View Order',
              onPress: () => navigation.navigate('OrderHistory', { orderId: response.data.orderId })
            },
            {
              text: 'Continue Shopping',
              onPress: () => navigation.navigate('Home')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Order error:', error);
      Alert.alert('Order Failed', 'Unable to process your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethod,
        selectedPaymentMethod === method.id && styles.selectedPaymentMethod
      ]}
      onPress={() => setSelectedPaymentMethod(method.id)}
    >
      <View style={styles.paymentMethodContent}>
        <Text style={styles.paymentMethodName}>{method.name}</Text>
        <Text style={styles.paymentMethodDetails}>{method.details}</Text>
      </View>
      <View style={[
        styles.radioButton,
        selectedPaymentMethod === method.id && styles.radioButtonSelected
      ]} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Checkout</Text>
        <Text style={styles.headerSubtitle}>Review your order</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.orderSummary}>
            <Text style={styles.itemCount}>{cartItems.length} items</Text>
            <Text style={styles.totalAmount}>₦{total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Delivery Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          
          <Text style={styles.inputLabel}>Delivery Address</Text>
          <TextInput
            style={styles.textInput}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Enter your delivery address"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.textInput}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
          />

          <Text style={styles.inputLabel}>Special Instructions (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special delivery instructions..."
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map(renderPaymentMethod)}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total: ₦{total.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.disabledButton]}
          onPress={processOrder}
          disabled={loading}
        >
          <Text style={styles.placeOrderButtonText}>
            {loading ? 'Processing...' : 'Place Order'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#4682b4',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e6f3ff',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  orderSummary: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: {
    fontSize: 16,
    color: '#666',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4682b4',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paymentMethod: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedPaymentMethod: {
    borderColor: '#4682b4',
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  paymentMethodDetails: {
    fontSize: 14,
    color: '#666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  radioButtonSelected: {
    borderColor: '#4682b4',
    backgroundColor: '#4682b4',
  },
  footer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalSection: {
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  placeOrderButton: {
    backgroundColor: '#4682b4',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  placeOrderButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
