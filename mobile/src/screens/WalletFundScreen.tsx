
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand?: string;
  bankName?: string;
  isDefault: boolean;
}

export default function WalletFundScreen() {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);

  const quickAmounts = [1000, 2500, 5000, 10000, 25000, 50000];

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payment-methods', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load payment methods');

      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
      
      // Auto-select default payment method
      const defaultMethod = data.paymentMethods?.find((pm: PaymentMethod) => pm.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoadingMethods(false);
    }
  };

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    return cleaned;
  };

  const formatCurrency = (amount: string) => {
    if (!amount) return '';
    const num = parseInt(amount);
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(num);
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const validateForm = () => {
    const amountNum = parseInt(amount);
    
    if (!amount || amountNum < 100) {
      Alert.alert('Error', 'Minimum funding amount is ₦100');
      return false;
    }
    
    if (amountNum > 500000) {
      Alert.alert('Error', 'Maximum funding amount is ₦500,000');
      return false;
    }

    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return false;
    }

    return true;
  };

  const handleFundWallet = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/fund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseInt(amount),
          paymentMethodId: selectedPaymentMethod
        })
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Success',
          `Wallet funded successfully with ${formatCurrency(amount)}`,
          [
            {
              text: 'View Wallet',
              onPress: () => navigation.navigate('WalletBalance' as never)
            },
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to fund wallet');
      }
    } catch (error) {
      console.error('Fund wallet error:', error);
      Alert.alert('Error', 'Failed to fund wallet');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    const isSelected = selectedPaymentMethod === method.id;
    
    return (
      <TouchableOpacity
        key={method.id}
        style={[
          styles.paymentMethodCard,
          isSelected && styles.selectedPaymentMethod
        ]}
        onPress={() => setSelectedPaymentMethod(method.id)}
      >
        <View style={styles.paymentMethodInfo}>
          <Text style={styles.paymentMethodType}>
            {method.type === 'card' ? '💳' : '🏦'} {method.type === 'card' ? 'Card' : 'Bank Account'}
          </Text>
          <Text style={styles.paymentMethodDetails}>
            {method.type === 'card' 
              ? `•••• •••• •••• ${method.last4}${method.brand ? ` (${method.brand})` : ''}`
              : `${method.bankName} - •••••${method.last4}`
            }
          </Text>
          {method.isDefault && (
            <Text style={styles.defaultBadge}>Default</Text>
          )}
        </View>
        
        <View style={[
          styles.radioButton,
          isSelected && styles.radioButtonSelected
        ]}>
          {isSelected && <View style={styles.radioButtonInner} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fund Wallet</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Amount Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter Amount</Text>
          
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>₦</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(text) => setAmount(formatAmount(text))}
              placeholder="0"
              keyboardType="numeric"
              maxLength={8}
            />
          </View>
          
          {amount && (
            <Text style={styles.amountPreview}>
              {formatCurrency(amount)}
            </Text>
          )}

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountsContainer}>
            <Text style={styles.quickAmountsTitle}>Quick Amounts</Text>
            <View style={styles.quickAmountsGrid}>
              {quickAmounts.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={[
                    styles.quickAmountButton,
                    amount === quickAmount.toString() && styles.selectedQuickAmount
                  ]}
                  onPress={() => handleQuickAmount(quickAmount)}
                >
                  <Text style={[
                    styles.quickAmountText,
                    amount === quickAmount.toString() && styles.selectedQuickAmountText
                  ]}>
                    ₦{quickAmount.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('AddPaymentMethod' as never)}
            >
              <Text style={styles.addMethodButton}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {loadingMethods ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#007bff" />
              <Text style={styles.loadingText}>Loading payment methods...</Text>
            </View>
          ) : paymentMethods.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No payment methods found</Text>
              <TouchableOpacity 
                style={styles.addFirstMethodButton}
                onPress={() => navigation.navigate('AddPaymentMethod' as never)}
              >
                <Text style={styles.addFirstMethodText}>Add Payment Method</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.paymentMethodsList}>
              {paymentMethods.map(renderPaymentMethod)}
            </View>
          )}
        </View>

        {/* Funding Limits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Funding Limits</Text>
          <View style={styles.limitsContainer}>
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Minimum</Text>
              <Text style={styles.limitValue}>₦100</Text>
            </View>
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Maximum (per transaction)</Text>
              <Text style={styles.limitValue}>₦500,000</Text>
            </View>
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Daily Limit</Text>
              <Text style={styles.limitValue}>₦2,000,000</Text>
            </View>
          </View>
        </View>

        {/* Fund Button */}
        <TouchableOpacity
          style={[
            styles.fundButton,
            (loading || !amount || !selectedPaymentMethod) && styles.fundButtonDisabled
          ]}
          onPress={handleFundWallet}
          disabled={loading || !amount || !selectedPaymentMethod}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.fundButtonText}>
              Fund Wallet {amount && `with ${formatCurrency(amount)}`}
            </Text>
          )}
        </TouchableOpacity>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Text style={styles.securityTitle}>🔒 Secure Transaction</Text>
          <Text style={styles.securityText}>
            All transactions are encrypted and processed securely through our payment partners.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 24,
    marginRight: 16,
    color: '#007bff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addMethodButton: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  amountPreview: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  quickAmountsContainer: {
    marginTop: 16,
  },
  quickAmountsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: '30%',
    alignItems: 'center',
  },
  selectedQuickAmount: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  quickAmountText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedQuickAmountText: {
    color: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  addFirstMethodButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  addFirstMethodText: {
    color: 'white',
    fontWeight: '500',
  },
  paymentMethodsList: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  selectedPaymentMethod: {
    borderColor: '#007bff',
    backgroundColor: '#f0f8ff',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  paymentMethodDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  defaultBadge: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007bff',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007bff',
  },
  limitsContainer: {
    gap: 12,
  },
  limitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitLabel: {
    fontSize: 14,
    color: '#666',
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  fundButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  fundButtonDisabled: {
    opacity: 0.6,
  },
  fundButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  securityNotice: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 20,
  },
});
