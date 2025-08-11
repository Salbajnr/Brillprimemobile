
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

const MoneyTransferScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    recipientPhone: '',
    amount: '',
    description: '',
    pin: ''
  });
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!formData.recipientPhone || !formData.amount || !formData.pin) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/api/money-transfer', {
        recipientPhone: formData.recipientPhone,
        amount: parseFloat(formData.amount),
        description: formData.description,
        pin: formData.pin
      });

      if (response.data.success) {
        Alert.alert('Success', 'Money transfer completed successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Transfer failed. Please try again.');
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
        <Text style={styles.title}>Send Money</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Recipient Phone Number</Text>
        <TextInput
          style={styles.input}
          value={formData.recipientPhone}
          onChangeText={(text) => setFormData({...formData, recipientPhone: text})}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Amount (₦)</Text>
        <TextInput
          style={styles.input}
          value={formData.amount}
          onChangeText={(text) => setFormData({...formData, amount: text})}
          placeholder="Enter amount"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={styles.input}
          value={formData.description}
          onChangeText={(text) => setFormData({...formData, description: text})}
          placeholder="What's this for?"
        />

        <Text style={styles.label}>Transaction PIN</Text>
        <TextInput
          style={styles.input}
          value={formData.pin}
          onChangeText={(text) => setFormData({...formData, pin: text})}
          placeholder="Enter your PIN"
          secureTextEntry
          keyboardType="numeric"
        />

        <TouchableOpacity 
          style={[styles.transferButton, loading && styles.disabledButton]} 
          onPress={handleTransfer}
          disabled={loading}
        >
          <Text style={styles.transferButtonText}>
            {loading ? 'Processing...' : 'Send Money'}
          </Text>
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
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  transferButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default MoneyTransferScreen;
