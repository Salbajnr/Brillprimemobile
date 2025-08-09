
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';

const TollPaymentsScreen = ({ navigation, route }: any) => {
  const [selectedToll, setSelectedToll] = useState('');
  const dispatch = useDispatch();
  const { balance } = useSelector((state: RootState) => state.wallet);
  const qrData = route?.params?.qrData;

  const tollGates = [
    { id: 'berger', name: 'Berger Toll Gate', amount: 200, location: 'Lagos-Ibadan Expressway' },
    { id: 'lekki', name: 'Lekki Toll Gate', amount: 250, location: 'Lekki-Epe Expressway' },
    { id: 'ojota', name: 'Ojota Toll Gate', amount: 150, location: 'Lagos-Ibadan Expressway' },
    { id: 'kara', name: 'Kara Toll Gate', amount: 200, location: 'Lagos-Ibadan Expressway' },
  ];

  const selectedTollGate = tollGates.find(toll => toll.id === selectedToll);

  const handlePayToll = async () => {
    const tollToPay = qrData || selectedTollGate;
    
    if (!tollToPay) {
      Alert.alert('Error', 'Please select a toll gate');
      return;
    }

    const amount = qrData?.amount || tollToPay.amount;

    if (balance < amount) {
      Alert.alert('Insufficient Balance', 'Please fund your wallet first', [
        { text: 'Cancel' },
        { text: 'Fund Wallet', onPress: () => navigation.navigate('WalletFund') }
      ]);
      return;
    }

    try {
      // Simulate payment processing
      Alert.alert(
        'Payment Successful',
        `Toll payment of ₦${amount} completed for ${qrData?.tollGate || tollToPay.name}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Payment failed. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Toll Payments</Text>
        <Text style={styles.balance}>Wallet Balance: ₦{balance.toFixed(2)}</Text>
      </View>

      {qrData ? (
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>Scanned QR Code</Text>
          <View style={styles.tollCard}>
            <Text style={styles.tollName}>{qrData.tollGate}</Text>
            <Text style={styles.tollAmount}>₦{qrData.amount}</Text>
          </View>
          
          <TouchableOpacity style={styles.payButton} onPress={handlePayToll}>
            <Text style={styles.payButtonText}>Pay ₦{qrData.amount}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tollSelection}>
          <Text style={styles.sectionTitle}>Select Toll Gate</Text>
          
          {tollGates.map((toll) => (
            <TouchableOpacity
              key={toll.id}
              style={[
                styles.tollCard,
                selectedToll === toll.id && styles.selectedToll,
              ]}
              onPress={() => setSelectedToll(toll.id)}
            >
              <View style={styles.tollInfo}>
                <Text style={styles.tollName}>{toll.name}</Text>
                <Text style={styles.tollLocation}>{toll.location}</Text>
              </View>
              <Text style={styles.tollAmount}>₦{toll.amount}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.scanButton} 
              onPress={() => navigation.navigate('QRScanner')}
            >
              <Text style={styles.scanButtonText}>📱 Scan QR Code</Text>
            </TouchableOpacity>

            {selectedTollGate && (
              <TouchableOpacity style={styles.payButton} onPress={handlePayToll}>
                <Text style={styles.payButtonText}>
                  Pay ₦{selectedTollGate.amount}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.recentPayments}>
        <Text style={styles.sectionTitle}>Recent Toll Payments</Text>
        <View style={styles.paymentItem}>
          <Text style={styles.paymentName}>Berger Toll Gate</Text>
          <Text style={styles.paymentDate}>Today, 2:30 PM</Text>
          <Text style={styles.paymentAmount}>₦200</Text>
        </View>
        <View style={styles.paymentItem}>
          <Text style={styles.paymentName}>Lekki Toll Gate</Text>
          <Text style={styles.paymentDate}>Yesterday, 8:15 AM</Text>
          <Text style={styles.paymentAmount}>₦250</Text>
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
    padding: 20,
    backgroundColor: '#2563eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  balance: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  qrSection: {
    padding: 20,
  },
  tollSelection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  tollCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedToll: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  tollInfo: {
    flex: 1,
  },
  tollName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tollLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  tollAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  actions: {
    marginTop: 20,
  },
  scanButton: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  payButton: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recentPayments: {
    padding: 20,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  paymentDate: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'center',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
});

export default TollPaymentsScreen;
