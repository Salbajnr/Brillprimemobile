
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { api } from '../services/api';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  merchant: string;
  rating: number;
  stock: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsResponse, categoriesResponse] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      
      setProducts(productsResponse.data || []);
      setCategories([{ id: 'all', name: 'All', icon: '🛍️' }, ...(categoriesResponse.data || [])]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = async (product: Product) => {
    try {
      await api.post('/cart', {
        userId: user?.id,
        productId: product.id,
        quantity: 1
      });
      Alert.alert('Success', `${product.name} added to cart`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.greeting}>Hello, {user?.firstName || 'User'}!</Text>
      <Text style={styles.subtitle}>What would you like to buy today?</Text>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              selectedCategory === category.id && styles.categoryItemSelected
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextSelected
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderProducts = () => (
    <View style={styles.productsContainer}>
      <Text style={styles.sectionTitle}>Featured Products</Text>
      <View style={styles.productsGrid}>
        {filteredProducts.map((product) => (
          <View key={product.id} style={styles.productCard}>
            <Image source={{ uri: product.image }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
              <Text style={styles.productMerchant}>{product.merchant}</Text>
              <View style={styles.productFooter}>
                <Text style={styles.productPrice}>₦{product.price.toLocaleString()}</Text>
                <TouchableOpacity
                  style={styles.addToCartButton}
                  onPress={() => addToCart(product)}
                >
                  <Text style={styles.addToCartText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {renderHeader()}
      {renderCategories()}
      {renderProducts()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#4682b4',
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e6f3ff',
    marginBottom: 20,
  },
  searchContainer: {
    marginTop: 10,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  categoriesScroll: {
    paddingHorizontal: 15,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    minWidth: 80,
  },
  categoryItemSelected: {
    backgroundColor: '#4682b4',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: '#ffffff',
  },
  productsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productMerchant: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4682b4',
  },
  addToCartButton: {
    backgroundColor: '#4682b4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addToCartText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
