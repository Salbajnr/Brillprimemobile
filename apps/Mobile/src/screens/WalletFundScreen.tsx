
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
import { updateWalletBalance } from '../store/slices/walletSlice';

const WalletFundScreen = ({ navigation }: any) => {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const dispatch = useDispatch();
  const { balance } = useSelector((state: RootState) => state.wallet);

  const paymentMethods = [
    { id: 'card', name: 'Debit/Credit Card', icon: '💳' },
    { id: 'bank', name: 'Bank Transfer', icon: '🏦' },
    { id: 'ussd', name: 'USSD', icon: '📱' },
  ];

  const handleFundWallet = async () => {
    if (!amount || !selectedMethod) {
      Alert.alert('Error', 'Please enter amount and select payment method');
      return;
    }

    try {
      // Simulate payment processing
      const fundAmount = parseFloat(amount);
      dispatch(updateWalletBalance(balance + fundAmount));
      Alert.alert('Success', `Wallet funded with ₦${amount}`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to fund wallet');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fund Wallet</Text>
        <Text style={styles.balance}>Current Balance: ₦{balance.toFixed(2)}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Enter Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Select Payment Method</Text>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodButton,
              selectedMethod === method.id && styles.selectedMethod,
            ]}
            onPress={() => setSelectedMethod(method.id)}
          >
            <Text style={styles.methodIcon}>{method.icon}</Text>
            <Text style={styles.methodName}>{method.name}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.fundButton} onPress={handleFundWallet}>
          <Text style={styles.fundButtonText}>Fund Wallet</Text>
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
    marginBottom: 10,
  },
  balance: {
    fontSize: 18,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  selectedMethod: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  methodName: {
    fontSize: 16,
    color: '#333',
  },
  fundButton: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  fundButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default WalletFundScreen;
