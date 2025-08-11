
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  merchantName: string;
  category: string;
}

const CartScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const response = await apiService.get('/api/cart');
      if (response.success) {
        setCartItems(response.data || []);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    setUpdating(itemId);
    try {
      const response = await apiService.put(`/api/cart/${itemId}`, { quantity: newQuantity });
      if (response.success) {
        setCartItems(prev =>
          prev.map(item =>
            item.id === itemId ? { ...item, quantity: newQuantity } : item
          )
        );
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.delete(`/api/cart/${itemId}`);
              if (response.success) {
                setCartItems(prev => prev.filter(item => item.id !== itemId));
              }
            } catch (error: any) {
              Alert.alert('Error', 'Failed to remove item');
            }
          }
        }
      ]
    );
  };

  const clearCart = async () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.delete('/api/cart');
              if (response.success) {
                setCartItems([]);
              }
            } catch (error: any) {
              Alert.alert('Error', 'Failed to clear cart');
            }
          }
        }
      ]
    );
  };

  const proceedToCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Add items to your cart before checkout');
      return;
    }
    navigation.navigate('Checkout');
  };

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <Image source={{ uri: item.productImage }} style={styles.productImage} />
      <View style={styles.itemDetails}>
        <Text style={styles.productName}>{item.productName}</Text>
        <Text style={styles.merchantName}>from {item.merchantName}</Text>
        <Text style={styles.productPrice}>₦{item.price.toLocaleString()}</Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
          disabled={updating === item.id}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
          disabled={updating === item.id}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeItem(item.id)}
      >
        <Text style={styles.removeButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <TouchableOpacity onPress={clearCart} disabled={cartItems.length === 0}>
          <Text style={[styles.clearButton, cartItems.length === 0 && styles.disabledButton]}>
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.id}
        renderItem={renderCartItem}
        contentContainerStyle={styles.cartList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🛒</Text>
            <Text style={styles.emptyStateText}>Your cart is empty</Text>
            <Text style={styles.emptyStateSubtext}>Add items to start shopping</Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => navigation.navigate('Commodities')}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {cartItems.length > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total ({cartItems.length} items)</Text>
            <Text style={styles.totalAmount}>₦{getTotalAmount().toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutButton} onPress={proceedToCheckout}>
            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
  clearButton: {
    color: '#fff',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  cartList: {
    padding: 15,
  },
  cartItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  itemDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  merchantName: {
    fontSize: 12,
    color: '#4682b4',
    marginBottom: 3,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  quantityButton: {
    backgroundColor: '#4682b4',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    padding: 5,
  },
  removeButtonText: {
    fontSize: 20,
  },
  cartSummary: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  checkoutButton: {
    backgroundColor: '#4682b4',
    borderRadius: 25,
    padding: 18,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#4682b4',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CartScreen;
