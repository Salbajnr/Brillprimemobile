
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

interface WalletData {
  balance: number;
  currency: string;
  formattedBalance: string;
  lastUpdated: string;
  accountNumber: string;
  bankName: string;
}

const WalletBalanceScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const response = await apiService.get('/api/wallet/balance');
      if (response.success) {
        setWalletData(response.data);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet information');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const handleFundWallet = () => {
    navigation.navigate('FundWallet');
  };

  const handleSendMoney = () => {
    navigation.navigate('SendMoney');
  };

  const handleTransactionHistory = () => {
    navigation.navigate('TransactionHistory');
  };

  const handleBillPayments = () => {
    navigation.navigate('BillPayments');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <TouchableOpacity onPress={handleTransactionHistory}>
          <Text style={styles.historyButton}>📊</Text>
        </TouchableOpacity>
      </View>

      {walletData && (
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <View style={styles.balanceRow}>
            {showBalance ? (
              <Text style={styles.balanceAmount}>{walletData.formattedBalance}</Text>
            ) : (
              <Text style={styles.balanceAmount}>****</Text>
            )}
            <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
              <Text style={styles.eyeIcon}>{showBalance ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountText}>Account: {walletData.accountNumber}</Text>
            <Text style={styles.bankText}>{walletData.bankName}</Text>
          </View>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleFundWallet}>
            <Text style={styles.actionIcon}>💳</Text>
            <Text style={styles.actionText}>Fund Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleSendMoney}>
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionText}>Send Money</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.servicesContainer}>
        <Text style={styles.servicesTitle}>Quick Services</Text>
        
        <TouchableOpacity style={styles.serviceItem} onPress={handleBillPayments}>
          <Text style={styles.serviceIcon}>⚡</Text>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>Pay Bills</Text>
            <Text style={styles.serviceDesc}>Electricity, Cable, Internet & more</Text>
          </View>
          <Text style={styles.serviceArrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.serviceItem} onPress={handleTransactionHistory}>
          <Text style={styles.serviceIcon}>📊</Text>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>Transaction History</Text>
            <Text style={styles.serviceDesc}>View all your transactions</Text>
          </View>
          <Text style={styles.serviceArrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.serviceItem} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.serviceIcon}>⚙️</Text>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>Account Settings</Text>
            <Text style={styles.serviceDesc}>Manage your account preferences</Text>
          </View>
          <Text style={styles.serviceArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.securityNotice}>
        <Text style={styles.securityIcon}>🔒</Text>
        <View style={styles.securityText}>
          <Text style={styles.securityTitle}>Your wallet is secure</Text>
          <Text style={styles.securityDesc}>All transactions are encrypted and protected with bank-level security.</Text>
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
  historyButton: {
    fontSize: 20,
  },
  balanceCard: {
    backgroundColor: '#4682b4',
    margin: 20,
    marginTop: -30,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  balanceLabel: {
    color: '#e5f2ff',
    fontSize: 16,
    marginBottom: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 15,
  },
  eyeIcon: {
    fontSize: 20,
  },
  accountInfo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  accountText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  bankText: {
    color: '#e5f2ff',
    fontSize: 12,
  },
  actionsContainer: {
    padding: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  servicesContainer: {
    padding: 20,
    paddingTop: 0,
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  serviceItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  serviceDesc: {
    fontSize: 12,
    color: '#666',
  },
  serviceArrow: {
    fontSize: 18,
    color: '#4682b4',
  },
  securityNotice: {
    backgroundColor: '#e8f4fd',
    flexDirection: 'row',
    padding: 15,
    margin: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#4682b4',
  },
  securityIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  securityDesc: {
    fontSize: 12,
    color: '#666',
  },
});

export default WalletBalanceScreen;
