
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, FlatList } from 'react-native';
import { NavigationProps } from '../shared/types';

interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  distance: string;
  deliveryTime: string;
  image: string;
  isOnline: boolean;
  specialOffer?: string;
  products: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
  }>;
}

const VendorFeedScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const mockVendors: Vendor[] = [
    {
      id: '1',
      name: 'TechHub Electronics',
      category: 'Electronics',
      rating: 4.8,
      distance: '2.5 km',
      deliveryTime: '30-45 min',
      image: '🏪',
      isOnline: true,
      specialOffer: '20% off on first order',
      products: [
        { id: '1', name: 'Wireless Headphones', price: 25000, image: '🎧' },
        { id: '2', name: 'Phone Case', price: 3500, image: '📱' },
      ],
    },
    {
      id: '2',
      name: 'Fresh Fuel Station',
      category: 'Fuel',
      rating: 4.5,
      distance: '1.2 km',
      deliveryTime: '15-25 min',
      image: '⛽',
      isOnline: true,
      products: [
        { id: '3', name: 'Premium Petrol', price: 617, image: '⛽' },
        { id: '4', name: 'Diesel', price: 580, image: '🚛' },
      ],
    },
    {
      id: '3',
      name: 'QuickMart Groceries',
      category: 'Groceries',
      rating: 4.3,
      distance: '3.8 km',
      deliveryTime: '20-35 min',
      image: '🛒',
      isOnline: false,
      products: [
        { id: '5', name: 'Rice (5kg)', price: 4500, image: '🍚' },
        { id: '6', name: 'Cooking Oil', price: 2800, image: '🛢️' },
      ],
    },
    {
      id: '4',
      name: 'Style & Fashion',
      category: 'Fashion',
      rating: 4.6,
      distance: '4.1 km',
      deliveryTime: '45-60 min',
      image: '👗',
      isOnline: true,
      specialOffer: 'Free delivery today',
      products: [
        { id: '7', name: 'Cotton T-Shirt', price: 8500, image: '👕' },
        { id: '8', name: 'Jeans', price: 15000, image: '👖' },
      ],
    },
  ];

  const categories = [
    { id: 'all', name: 'All', icon: '🏪' },
    { id: 'Electronics', name: 'Electronics', icon: '📱' },
    { id: 'Fuel', name: 'Fuel', icon: '⛽' },
    { id: 'Groceries', name: 'Groceries', icon: '🛒' },
    { id: 'Fashion', name: 'Fashion', icon: '👗' },
    { id: 'Food', name: 'Food', icon: '🍔' },
  ];

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setVendors(mockVendors);
      setLoading(false);
    }, 1000);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVendors();
    setRefreshing(false);
  };

  const filteredVendors = activeCategory === 'all' 
    ? vendors 
    : vendors.filter(vendor => vendor.category === activeCategory);

  const handleVendorPress = (vendor: Vendor) => {
    // Navigate to vendor details page
    console.log('Navigate to vendor:', vendor.id);
  };

  const handleProductPress = (vendorId: string, productId: string) => {
    // Navigate to product details
    console.log('Navigate to product:', productId, 'from vendor:', vendorId);
  };

  const renderVendorCard = ({ item: vendor }: { item: Vendor }) => (
    <TouchableOpacity
      style={[styles.vendorCard, !vendor.isOnline && styles.offlineVendor]}
      onPress={() => handleVendorPress(vendor)}
    >
      {/* Vendor Header */}
      <View style={styles.vendorHeader}>
        <Text style={styles.vendorImage}>{vendor.image}</Text>
        <View style={styles.vendorInfo}>
          <View style={styles.vendorTitleRow}>
            <Text style={styles.vendorName}>{vendor.name}</Text>
            <View style={[styles.statusDot, { backgroundColor: vendor.isOnline ? '#28a745' : '#dc3545' }]} />
          </View>
          
          <Text style={styles.vendorCategory}>{vendor.category}</Text>
          
          <View style={styles.vendorMeta}>
            <Text style={styles.rating}>⭐ {vendor.rating}</Text>
            <Text style={styles.distance}>📍 {vendor.distance}</Text>
            <Text style={styles.deliveryTime}>🕒 {vendor.deliveryTime}</Text>
          </View>
        </View>
      </View>

      {/* Special Offer */}
      {vendor.specialOffer && (
        <View style={styles.specialOffer}>
          <Text style={styles.specialOfferText}>🎉 {vendor.specialOffer}</Text>
        </View>
      )}

      {/* Featured Products */}
      {vendor.isOnline && (
        <View style={styles.productsContainer}>
          <Text style={styles.productsTitle}>Featured Products</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.productsScroll}
          >
            {vendor.products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => handleProductPress(vendor.id, product.id)}
              >
                <Text style={styles.productImage}>{product.image}</Text>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productPrice}>
                  ₦{product.price.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Offline Status */}
      {!vendor.isOnline && (
        <View style={styles.offlineStatus}>
          <Text style={styles.offlineText}>Currently Offline</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendor Feed</Text>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => navigation.navigate('SearchResults')}
        >
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              activeCategory === category.id && styles.activeCategoryButton
            ]}
            onPress={() => setActiveCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryText,
                activeCategory === category.id && styles.activeCategoryText
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Vendors List */}
      <View style={styles.vendorsContainer}>
        <Text style={styles.vendorsHeader}>
          {filteredVendors.length} vendors {activeCategory !== 'all' ? `in ${activeCategory}` : 'available'}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading vendors...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredVendors}
            renderItem={renderVendorCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.vendorsList}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  backButtonText: {
    fontSize: 18,
    color: '#4682b4',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131313',
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#4682b4',
  },
  searchButtonText: {
    fontSize: 18,
    color: '#ffffff',
  },
  categoriesContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 80,
  },
  activeCategoryButton: {
    backgroundColor: '#4682b4',
    borderColor: '#4682b4',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#ffffff',
  },
  vendorsContainer: {
    flex: 1,
    padding: 20,
  },
  vendorsHeader: {
    fontSize: 16,
    fontWeight: '500',
    color: '#131313',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  vendorsList: {
    paddingBottom: 20,
  },
  vendorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offlineVendor: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  vendorHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  vendorImage: {
    fontSize: 40,
    marginRight: 16,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131313',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  vendorCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  vendorMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  rating: {
    fontSize: 12,
    color: '#ffc107',
  },
  distance: {
    fontSize: 12,
    color: '#666',
  },
  deliveryTime: {
    fontSize: 12,
    color: '#666',
  },
  specialOffer: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  specialOfferText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
  },
  productsContainer: {
    marginTop: 8,
  },
  productsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#131313',
    marginBottom: 8,
  },
  productsScroll: {
    paddingVertical: 4,
  },
  productCard: {
    width: 100,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
    alignItems: 'center',
  },
  productImage: {
    fontSize: 24,
    marginBottom: 4,
  },
  productName: {
    fontSize: 10,
    color: '#131313',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 12,
    height: 24,
  },
  productPrice: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4682b4',
  },
  offlineStatus: {
    backgroundColor: '#f8d7da',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#dc3545',
  },
  offlineText: {
    fontSize: 12,
    color: '#721c24',
    fontWeight: '500',
  },
});

export default VendorFeedScreen;
