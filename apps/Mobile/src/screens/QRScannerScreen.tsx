
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useDispatch } from 'react-redux';

const { width, height } = Dimensions.get('window');

const QRScannerScreen = ({ navigation }: any) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    // Simulate camera permission request
    setHasPermission(true);
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    
    try {
      // Parse QR code data
      const qrData = JSON.parse(data);
      
      if (qrData.type === 'payment') {
        Alert.alert(
          'Payment QR Detected',
          `Merchant: ${qrData.merchantName}\nAmount: ₦${qrData.amount}`,
          [
            { text: 'Cancel', onPress: () => setScanned(false) },
            { 
              text: 'Pay', 
              onPress: () => navigation.navigate('SecurePayment', { qrData })
            }
          ]
        );
      } else if (qrData.type === 'toll') {
        Alert.alert(
          'Toll Payment QR Detected',
          `Toll Gate: ${qrData.tollGate}\nAmount: ₦${qrData.amount}`,
          [
            { text: 'Cancel', onPress: () => setScanned(false) },
            { 
              text: 'Pay', 
              onPress: () => navigation.navigate('TollPayments', { qrData })
            }
          ]
        );
      } else {
        Alert.alert('QR Code Scanned', `Data: ${data}`, [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
      }
    } catch (error) {
      // Handle plain text QR codes
      Alert.alert('QR Code Scanned', `Data: ${data}`, [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    }
  };

  const simulateQRScan = (type: string) => {
    let mockData: any;
    
    switch (type) {
      case 'payment':
        mockData = {
          type: 'payment',
          merchantName: 'Test Merchant',
          amount: 1500,
          merchantId: 'merchant_123'
        };
        break;
      case 'toll':
        mockData = {
          type: 'toll',
          tollGate: 'Berger Toll Gate',
          amount: 200,
          tollId: 'toll_456'
        };
        break;
      default:
        mockData = { type: 'unknown', data: 'Sample QR Code Data' };
    }
    
    handleBarCodeScanned({ type: 'qr', data: JSON.stringify(mockData) });
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setHasPermission(true)}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.instruction}>
            Point your camera at a QR code to scan
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => simulateQRScan('payment')}
        >
          <Text style={styles.buttonText}>Simulate Payment QR</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => simulateQRScan('toll')}
        >
          <Text style={styles.buttonText}>Simulate Toll QR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#333',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  controls: {
    padding: 20,
    backgroundColor: '#000',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QRScannerScreen;
