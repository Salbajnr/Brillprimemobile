
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

const PaymentMethodsScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await apiService.get('/api/user/payment-methods');
      setPaymentMethods(response.data.paymentMethods || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = () => {
    navigation.navigate('AddPaymentMethod');
  };

  const handleRemoveCard = async (cardId: string) => {
    Alert.alert(
      'Remove Card',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.delete(`/api/user/payment-methods/${cardId}`);
              setPaymentMethods(paymentMethods.filter(pm => pm.id !== cardId));
              Alert.alert('Success', 'Payment method removed');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove payment method');
            }
          }
        }
      ]
    );
  };

  const getCardIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      case 'verve': return '💳';
      default: return '💳';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading payment methods...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payment Methods</Text>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddCard}>
        <Text style={styles.addButtonText}>+ Add New Card</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Cards</Text>
        {paymentMethods.length === 0 ? (
          <Text style={styles.emptyText}>No payment methods added yet</Text>
        ) : (
          paymentMethods.map((method, index) => (
            <View key={index} style={styles.cardItem}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardIcon}>{getCardIcon(method.type)}</Text>
                <View style={styles.cardDetails}>
                  <Text style={styles.cardNumber}>•••• •••• •••• {method.lastFour}</Text>
                  <Text style={styles.cardType}>{method.type} • Expires {method.expiry}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveCard(method.id)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wallet</Text>
        <View style={styles.walletItem}>
          <Text style={styles.walletIcon}>💰</Text>
          <View style={styles.walletDetails}>
            <Text style={styles.walletText}>BrillPrime Wallet</Text>
            <Text style={styles.walletBalance}>Balance: ₦0.00</Text>
          </View>
          <TouchableOpacity
            style={styles.fundButton}
            onPress={() => navigation.navigate('WalletBalance')}
          >
            <Text style={styles.fundButtonText}>Fund</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Other Payment Options</Text>
        <View style={styles.otherOption}>
          <Text style={styles.otherIcon}>📱</Text>
          <Text style={styles.otherText}>Pay on Delivery</Text>
        </View>
        <View style={styles.otherOption}>
          <Text style={styles.otherIcon}>🏦</Text>
          <Text style={styles.otherText}>Bank Transfer</Text>
        </View>
      </View>
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
  addButton: {
    backgroundColor: '#007bff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    padding: 20,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardDetails: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  cardType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    color: '#dc3545',
    fontSize: 14,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  walletIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  walletDetails: {
    flex: 1,
  },
  walletText: {
    fontSize: 16,
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  fundButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  fundButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  otherOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  otherIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  otherText: {
    fontSize: 16,
  },
});

export default PaymentMethodsScreen;
