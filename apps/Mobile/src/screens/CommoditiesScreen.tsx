
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { useDispatch } from 'react-redux';

const CommoditiesScreen = ({ navigation }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const dispatch = useDispatch();

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'grains', name: 'Grains' },
    { id: 'vegetables', name: 'Vegetables' },
    { id: 'fruits', name: 'Fruits' },
    { id: 'dairy', name: 'Dairy' },
    { id: 'meat', name: 'Meat' },
  ];

  const commodities = [
    {
      id: '1',
      name: 'Rice (50kg bag)',
      category: 'grains',
      price: 45000,
      unit: 'bag',
      vendor: 'Alaba Market',
      rating: 4.5,
      image: '🌾',
      inStock: true,
    },
    {
      id: '2',
      name: 'Tomatoes',
      category: 'vegetables',
      price: 500,
      unit: 'kg',
      vendor: 'Mile 12 Market',
      rating: 4.2,
      image: '🍅',
      inStock: true,
    },
    {
      id: '3',
      name: 'Onions',
      category: 'vegetables',
      price: 800,
      unit: 'kg',
      vendor: 'Dawanau Market',
      rating: 4.3,
      image: '🧅',
      inStock: true,
    },
    {
      id: '4',
      name: 'Chicken',
      category: 'meat',
      price: 3500,
      unit: 'kg',
      vendor: 'Bodija Market',
      rating: 4.7,
      image: '🐔',
      inStock: false,
    },
    {
      id: '5',
      name: 'Bananas',
      category: 'fruits',
      price: 300,
      unit: 'bunch',
      vendor: 'Ogbomoso Market',
      rating: 4.1,
      image: '🍌',
      inStock: true,
    },
  ];

  const filteredCommodities = commodities.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (commodity: any) => {
    // Simulate adding to cart
    navigation.navigate('Cart', { addedItem: commodity });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Commodities</Text>
        <TextInput
          style={styles.searchInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search commodities..."
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.selectedCategory,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.selectedCategoryText,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.commoditiesList}>
        {filteredCommodities.map((commodity) => (
          <View key={commodity.id} style={styles.commodityCard}>
            <View style={styles.commodityHeader}>
              <Text style={styles.commodityImage}>{commodity.image}</Text>
              <View style={styles.commodityInfo}>
                <Text style={styles.commodityName}>{commodity.name}</Text>
                <Text style={styles.commodityVendor}>{commodity.vendor}</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.rating}>⭐ {commodity.rating}</Text>
                  <Text style={[
                    styles.stockStatus,
                    { color: commodity.inStock ? '#10b981' : '#dc2626' }
                  ]}>
                    {commodity.inStock ? 'In Stock' : 'Out of Stock'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.commodityFooter}>
              <Text style={styles.price}>
                ₦{commodity.price.toLocaleString()}/{commodity.unit}
              </Text>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  !commodity.inStock && styles.disabledButton,
                ]}
                onPress={() => handleAddToCart(commodity)}
                disabled={!commodity.inStock}
              >
                <Text style={styles.addButtonText}>
                  {commodity.inStock ? 'Add to Cart' : 'Out of Stock'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
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
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  categories: {
    paddingVertical: 15,
    paddingLeft: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCategory: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryText: {
    color: 'white',
  },
  commoditiesList: {
    flex: 1,
    padding: 20,
  },
  commodityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  commodityHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  commodityImage: {
    fontSize: 48,
    marginRight: 15,
  },
  commodityInfo: {
    flex: 1,
  },
  commodityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  commodityVendor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#f59e0b',
  },
  stockStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  commodityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CommoditiesScreen;
