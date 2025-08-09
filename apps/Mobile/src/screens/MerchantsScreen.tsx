
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';

const MerchantsScreen = ({ navigation }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'food', name: 'Food & Drinks' },
    { id: 'fuel', name: 'Fuel Stations' },
    { id: 'retail', name: 'Retail' },
    { id: 'services', name: 'Services' },
  ];

  const merchants = [
    {
      id: '1',
      name: 'Prime Fuel Station',
      category: 'fuel',
      rating: 4.8,
      distance: '2.3 km',
      image: '⛽',
      isOpen: true,
      specialOffers: ['10% off premium fuel'],
    },
    {
      id: '2',
      name: 'Fresh Market Hub',
      category: 'food',
      rating: 4.5,
      distance: '1.8 km',
      image: '🛒',
      isOpen: true,
      specialOffers: ['Free delivery over ₦5000'],
    },
    {
      id: '3',
      name: 'TechBay Electronics',
      category: 'retail',
      rating: 4.6,
      distance: '3.1 km',
      image: '📱',
      isOpen: false,
      specialOffers: ['20% off smartphones'],
    },
    {
      id: '4',
      name: 'QuickServe Restaurant',
      category: 'food',
      rating: 4.3,
      distance: '0.9 km',
      image: '🍽️',
      isOpen: true,
      specialOffers: ['Buy 1 get 1 free meals'],
    },
  ];

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || merchant.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Merchants</Text>
        <TextInput
          style={styles.searchInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search merchants..."
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

      <ScrollView style={styles.merchantsList}>
        {filteredMerchants.map((merchant) => (
          <TouchableOpacity
            key={merchant.id}
            style={styles.merchantCard}
            onPress={() => navigation.navigate('MerchantDetails', { merchant })}
          >
            <View style={styles.merchantHeader}>
              <Text style={styles.merchantImage}>{merchant.image}</Text>
              <View style={styles.merchantInfo}>
                <Text style={styles.merchantName}>{merchant.name}</Text>
                <View style={styles.merchantMeta}>
                  <Text style={styles.rating}>⭐ {merchant.rating}</Text>
                  <Text style={styles.distance}>📍 {merchant.distance}</Text>
                  <Text style={[
                    styles.status,
                    { color: merchant.isOpen ? '#10b981' : '#dc2626' }
                  ]}>
                    {merchant.isOpen ? 'Open' : 'Closed'}
                  </Text>
                </View>
              </View>
            </View>

            {merchant.specialOffers.length > 0 && (
              <View style={styles.offersContainer}>
                <Text style={styles.offersTitle}>Special Offers:</Text>
                {merchant.specialOffers.map((offer, index) => (
                  <Text key={index} style={styles.offer}>• {offer}</Text>
                ))}
              </View>
            )}
          </TouchableOpacity>
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
  merchantsList: {
    flex: 1,
    padding: 20,
  },
  merchantCard: {
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
  merchantHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  merchantImage: {
    fontSize: 48,
    marginRight: 15,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  merchantMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#f59e0b',
  },
  distance: {
    fontSize: 14,
    color: '#666',
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  offersContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  offersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 5,
  },
  offer: {
    fontSize: 12,
    color: '#2563eb',
    marginBottom: 2,
  },
});

export default MerchantsScreen;
