
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

interface BillCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  providers: BillProvider[];
}

interface BillProvider {
  id: string;
  name: string;
  logo: string;
  category: string;
}

const BillPaymentsScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [customerNumber, setCustomerNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const billCategories: BillCategory[] = [
    {
      id: 'electricity',
      name: 'Electricity',
      icon: '⚡',
      description: 'Pay your electricity bills',
      providers: [
        { id: 'aedc', name: 'AEDC', logo: '⚡', category: 'electricity' },
        { id: 'eko', name: 'Eko Electricity', logo: '⚡', category: 'electricity' },
        { id: 'ikeja', name: 'Ikeja Electric', logo: '⚡', category: 'electricity' },
      ]
    },
    {
      id: 'cable',
      name: 'Cable TV',
      icon: '📺',
      description: 'Subscribe to cable TV',
      providers: [
        { id: 'dstv', name: 'DSTV', logo: '📺', category: 'cable' },
        { id: 'gotv', name: 'GOtv', logo: '📺', category: 'cable' },
        { id: 'startimes', name: 'StarTimes', logo: '📺', category: 'cable' },
      ]
    },
    {
      id: 'internet',
      name: 'Internet',
      icon: '🌐',
      description: 'Pay for internet services',
      providers: [
        { id: 'mtn', name: 'MTN', logo: '🌐', category: 'internet' },
        { id: 'airtel', name: 'Airtel', logo: '🌐', category: 'internet' },
        { id: 'glo', name: 'Glo', logo: '🌐', category: 'internet' },
        { id: '9mobile', name: '9mobile', logo: '🌐', category: 'internet' },
      ]
    },
    {
      id: 'water',
      name: 'Water',
      icon: '💧',
      description: 'Pay water bills',
      providers: [
        { id: 'lagos_water', name: 'Lagos Water Corporation', logo: '💧', category: 'water' },
        { id: 'abuja_water', name: 'Abuja Water Board', logo: '💧', category: 'water' },
      ]
    }
  ];

  const handlePayment = async () => {
    if (!selectedProvider || !customerNumber || !amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/api/bills/payment', {
        providerId: selectedProvider,
        customerNumber,
        amount: numericAmount,
        category: selectedCategory,
      });

      if (response.success) {
        Alert.alert(
          'Payment Successful',
          'Your bill payment has been processed successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Payment Failed', error.message || 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setSelectedProvider(null);
    setCustomerNumber('');
    setAmount('');
  };

  if (selectedCategory && selectedProvider) {
    const category = billCategories.find(cat => cat.id === selectedCategory);
    const provider = category?.providers.find(prov => prov.id === selectedProvider);

    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedProvider(null)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pay {provider?.name}</Text>
          <TouchableOpacity onPress={resetForm}>
            <Text style={styles.resetButton}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.providerCard}>
          <Text style={styles.providerIcon}>{provider?.logo}</Text>
          <Text style={styles.providerName}>{provider?.name}</Text>
          <Text style={styles.providerCategory}>{category?.name}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Customer Number/ID *</Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter your ${provider?.name} number`}
              value={customerNumber}
              onChangeText={setCustomerNumber}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Amount (₦) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount to pay"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={[styles.payButton, loading && styles.buttonDisabled]}
            onPress={handlePayment}
            disabled={loading}
          >
            <Text style={styles.payButtonText}>
              {loading ? 'Processing...' : `Pay ₦${amount || '0'}`}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Payment Information</Text>
          <Text style={styles.infoText}>
            • Payment will be processed instantly
          </Text>
          <Text style={styles.infoText}>
            • You'll receive a confirmation SMS
          </Text>
          <Text style={styles.infoText}>
            • Keep your receipt for future reference
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (selectedCategory) {
    const category = billCategories.find(cat => cat.id === selectedCategory);

    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedCategory(null)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{category?.name} Bills</Text>
          <View style={styles.placeholder} />
        </View>

        <Text style={styles.sectionTitle}>Select Provider</Text>
        
        {category?.providers.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            style={styles.providerItem}
            onPress={() => setSelectedProvider(provider.id)}
          >
            <Text style={styles.providerItemIcon}>{provider.logo}</Text>
            <View style={styles.providerItemContent}>
              <Text style={styles.providerItemName}>{provider.name}</Text>
              <Text style={styles.providerItemDescription}>
                Pay your {category.name.toLowerCase()} bills
              </Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Payments</Text>
        <View style={styles.placeholder} />
      </View>

      <Text style={styles.sectionTitle}>Select Bill Category</Text>
      
      {billCategories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={styles.categoryCard}
          onPress={() => setSelectedCategory(category.id)}
        >
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <View style={styles.categoryContent}>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryDescription}>{category.description}</Text>
            <Text style={styles.providerCount}>
              {category.providers.length} providers available
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.recentPayments}>
        <Text style={styles.recentTitle}>Recent Payments</Text>
        <View style={styles.emptyRecent}>
          <Text style={styles.emptyRecentText}>No recent payments</Text>
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
  resetButton: {
    color: '#fff',
    fontSize: 16,
  },
  placeholder: {
    width: 50,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    margin: 20,
    marginBottom: 10,
  },
  categoryCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  providerCount: {
    fontSize: 12,
    color: '#4682b4',
  },
  arrow: {
    fontSize: 18,
    color: '#4682b4',
  },
  providerItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerItemIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  providerItemContent: {
    flex: 1,
  },
  providerItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  providerItemDescription: {
    fontSize: 14,
    color: '#666',
  },
  providerCard: {
    backgroundColor: '#4682b4',
    margin: 15,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  providerIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  providerName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  providerCategory: {
    color: '#e5f2ff',
    fontSize: 14,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4682b4',
    borderRadius: 25,
    padding: 15,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payButton: {
    backgroundColor: '#4682b4',
    borderRadius: 25,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#e8f4fd',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#4682b4',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  recentPayments: {
    margin: 15,
    marginTop: 30,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  emptyRecent: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
  },
  emptyRecentText: {
    fontSize: 16,
    color: '#666',
  },
});

export default BillPaymentsScreen;
