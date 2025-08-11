
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

interface CartItem {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  merchantName: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet' | 'bank';
  lastFour?: string;
  bankName?: string;
  cardType?: string;
}

const CheckoutScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      const [cartResponse, paymentResponse] = await Promise.all([
        apiService.get('/api/cart'),
        apiService.get('/api/payments/methods')
      ]);

      if (cartResponse.success) {
        setCartItems(cartResponse.data || []);
      }

      if (paymentResponse.success) {
        setPaymentMethods(paymentResponse.data || []);
        if (paymentResponse.data?.length > 0) {
          setSelectedPayment(paymentResponse.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading checkout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = 500; // Fixed delivery fee
    const total = subtotal + deliveryFee;
    return { subtotal, deliveryFee, total };
  };

  const processOrder = async () => {
    if (!selectedPayment) {
      Alert.alert('Payment Required', 'Please select a payment method');
      return;
    }

    if (!deliveryAddress.trim()) {
      Alert.alert('Address Required', 'Please provide a delivery address');
      return;
    }

    const { total } = calculateTotals();

    Alert.alert(
      'Confirm Order',
      `Total: ₦${total.toLocaleString()}\nProceed with payment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setProcessing(true);
            try {
              const response = await apiService.post('/api/orders', {
                items: cartItems,
                paymentMethodId: selectedPayment,
                deliveryAddress: deliveryAddress.trim(),
                totalAmount: total,
              });

              if (response.success) {
                // Clear cart after successful order
                await apiService.delete('/api/cart');
                
                Alert.alert(
                  'Order Placed!',
                  'Your order has been placed successfully. You can track it from your order history.',
                  [{ text: 'OK', onPress: () => navigation.navigate('OrderHistory') }]
                );
              }
            } catch (error: any) {
              Alert.alert('Order Failed', error.message || 'Failed to place order. Please try again.');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card': return '💳';
      case 'wallet': return '💰';
      case 'bank': return '🏦';
      default: return '💳';
    }
  };

  const getPaymentMethodDisplay = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return `${method.cardType} ****${method.lastFour}`;
      case 'wallet':
        return 'BrillPrime Wallet';
      case 'bank':
        return `${method.bankName} ****${method.lastFour}`;
      default:
        return 'Payment Method';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </View>
    );
  }

  const { subtotal, deliveryFee, total } = calculateTotals();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {cartItems.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <Text style={styles.itemName}>{item.productName}</Text>
            <Text style={styles.itemDetails}>
              {item.quantity}x ₦{item.price.toLocaleString()} from {item.merchantName}
            </Text>
            <Text style={styles.itemTotal}>₦{(item.price * item.quantity).toLocaleString()}</Text>
          </View>
        ))}
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <TouchableOpacity style={styles.addressInput}>
          <Text style={styles.addressLabel}>Deliver to:</Text>
          <Text style={styles.addressText}>
            {deliveryAddress || 'Tap to set delivery address'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethod,
              selectedPayment === method.id && styles.selectedPayment
            ]}
            onPress={() => setSelectedPayment(method.id)}
          >
            <Text style={styles.paymentIcon}>{getPaymentMethodIcon(method)}</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentDisplay}>{getPaymentMethodDisplay(method)}</Text>
            </View>
            <View style={[
              styles.radioButton,
              selectedPayment === method.id && styles.radioButtonSelected
            ]} />
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity
          style={styles.addPaymentButton}
          onPress={() => navigation.navigate('AddPaymentMethod')}
        >
          <Text style={styles.addPaymentText}>+ Add Payment Method</Text>
        </TouchableOpacity>
      </View>

      {/* Order Total */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Total</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>₦{subtotal.toLocaleString()}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Delivery Fee</Text>
          <Text style={styles.totalValue}>₦{deliveryFee.toLocaleString()}</Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>₦{total.toLocaleString()}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.checkoutButton, processing && styles.buttonDisabled]}
        onPress={processOrder}
        disabled={processing}
      >
        <Text style={styles.checkoutButtonText}>
          {processing ? 'Processing...' : `Pay ₦${total.toLocaleString()}`}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#4682b4',
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 50,
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  orderItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4682b4',
    textAlign: 'right',
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
  },
  addressLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  selectedPayment: {
    borderColor: '#4682b4',
    backgroundColor: '#f0f8ff',
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDisplay: {
    fontSize: 16,
    color: '#333',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  radioButtonSelected: {
    borderColor: '#4682b4',
    backgroundColor: '#4682b4',
  },
  addPaymentButton: {
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#4682b4',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  addPaymentText: {
    color: '#4682b4',
    fontSize: 16,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    color: '#333',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 10,
    paddingTop: 15,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4682b4',
  },
  checkoutButton: {
    backgroundColor: '#4682b4',
    margin: 15,
    borderRadius: 25,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;
