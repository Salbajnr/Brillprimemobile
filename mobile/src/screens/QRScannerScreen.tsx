
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

// Note: In a real implementation, you would use react-native-camera or expo-camera
// For this demo, we'll simulate QR scanning functionality

const { width, height } = Dimensions.get('window');

const QRScannerScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const scanType = route?.params?.type || 'general'; // payment, delivery, etc.

  const handleQRScan = async (data: string) => {
    setScanning(false);
    setScannedData(data);

    try {
      const response = await apiService.post('/api/qr/scan', {
        qrCode: data,
        type: scanType,
      });

      if (response.success) {
        const result = response.data;

        switch (result.type) {
          case 'payment':
            // Navigate to payment confirmation
            navigation.navigate('PaymentConfirmation', { qrData: result });
            break;
          case 'delivery':
            // Handle delivery verification
            handleDeliveryVerification(result);
            break;
          case 'merchant':
            // Navigate to merchant details
            navigation.navigate('MerchantDetail', { merchantId: result.merchantId });
            break;
          case 'toll':
            // Navigate to toll payment
            navigation.navigate('TollPayment', { tollData: result });
            break;
          default:
            Alert.alert('QR Code Scanned', `Data: ${data}`);
        }
      }
    } catch (error: any) {
      Alert.alert('Scan Error', error.message || 'Failed to process QR code');
    }
  };

  const handleDeliveryVerification = async (deliveryData: any) => {
    Alert.alert(
      'Verify Delivery',
      `Order #${deliveryData.orderId}\nConfirm delivery completion?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = await apiService.post('/api/qr/verify-delivery', {
                orderId: deliveryData.orderId,
                qrCode: scannedData,
                driverConfirmed: true,
              });

              if (response.success) {
                Alert.alert(
                  'Delivery Confirmed',
                  'Delivery has been successfully verified!',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              }
            } catch (error: any) {
              Alert.alert('Verification Failed', error.message);
            }
          }
        }
      ]
    );
  };

  const simulateQRScan = () => {
    // Simulate different QR code types for demo purposes
    const sampleQRCodes = [
      'payment:merchant123:amount:5000',
      'delivery:order456:location:lagos',
      'toll:gate789:amount:200',
      'merchant:shop123:category:food',
    ];

    const randomCode = sampleQRCodes[Math.floor(Math.random() * sampleQRCodes.length)];
    handleQRScan(randomCode);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Scanner</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.scannerContainer}>
        <View style={styles.cameraPreview}>
          {/* In a real app, camera component would go here */}
          <View style={styles.scanFrame}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <Text style={styles.instructionText}>
            {scanning ? 'Scanning...' : 'Position QR code within the frame'}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.scanButton, scanning && styles.buttonDisabled]}
            onPress={simulateQRScan}
            disabled={scanning}
          >
            <Text style={styles.scanButtonText}>
              {scanning ? 'Scanning...' : 'Tap to Scan QR Code'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            Point your camera at a QR code to scan it automatically
          </Text>
        </View>
      </View>

      <View style={styles.bottomInfo}>
        <Text style={styles.infoTitle}>Scan Types Supported:</Text>
        <Text style={styles.infoItem}>💳 Payment QR codes</Text>
        <Text style={styles.infoItem}>📦 Delivery verification</Text>
        <Text style={styles.infoItem}>🛍️ Merchant information</Text>
        <Text style={styles.infoItem}>🚗 Toll gate payments</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPreview: {
    width: width,
    height: height * 0.6,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4682b4',
    borderWidth: 3,
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    top: 'auto',
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 40,
  },
  controls: {
    padding: 20,
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#4682b4',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 15,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  bottomInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    paddingLeft: 10,
  },
});

export default QRScannerScreen;
