
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList } from 'react-native';
import { NavigationProps } from '../shared/types';

interface SearchResult {
  id: string;
  type: 'product' | 'merchant' | 'service';
  name: string;
  description: string;
  price?: number;
  rating: number;
  image: string;
  category: string;
  distance?: string;
}

const SearchResultsScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const [searchQuery, setSearchQuery] = useState(route?.params?.query || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'products' | 'merchants' | 'services'>('all');

  const mockResults: SearchResult[] = [
    {
      id: '1',
      type: 'product',
      name: 'Wireless Bluetooth Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      price: 25000,
      rating: 4.5,
      image: '🎧',
      category: 'Electronics',
    },
    {
      id: '2',
      type: 'merchant',
      name: 'TechHub Electronics',
      description: 'Your one-stop shop for all electronics',
      rating: 4.8,
      image: '🏪',
      category: 'Electronics Store',
      distance: '2.5 km away',
    },
    {
      id: '3',
      type: 'service',
      name: 'Fast Fuel Delivery',
      description: 'Quick fuel delivery to your location',
      price: 500,
      rating: 4.3,
      image: '⛽',
      category: 'Fuel Service',
    },
    {
      id: '4',
      type: 'product',
      name: 'Smartphone Case',
      description: 'Protective case for smartphones',
      price: 3500,
      rating: 4.2,
      image: '📱',
      category: 'Accessories',
    },
    {
      id: '5',
      type: 'merchant',
      name: 'Quick Mart',
      description: 'Convenience store with daily essentials',
      rating: 4.0,
      image: '🏬',
      category: 'Convenience Store',
      distance: '1.2 km away',
    },
  ];

  useEffect(() => {
    performSearch();
  }, [searchQuery, activeFilter]);

  const performSearch = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      let filteredResults = mockResults;
      
      if (searchQuery) {
        filteredResults = filteredResults.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      if (activeFilter !== 'all') {
        filteredResults = filteredResults.filter(item => {
          if (activeFilter === 'products') return item.type === 'product';
          if (activeFilter === 'merchants') return item.type === 'merchant';
          if (activeFilter === 'services') return item.type === 'service';
          return true;
        });
      }
      
      setResults(filteredResults);
      setLoading(false);
    }, 1000);
  };

  const handleSearch = () => {
    performSearch();
  };

  const handleItemPress = (item: SearchResult) => {
    if (item.type === 'product') {
      // Navigate to product details
      console.log('Navigate to product:', item.id);
    } else if (item.type === 'merchant') {
      // Navigate to merchant page
      console.log('Navigate to merchant:', item.id);
    } else if (item.type === 'service') {
      // Navigate to service booking
      console.log('Navigate to service:', item.id);
    }
  };

  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => handleItemPress(item)}
    >
      <Text style={styles.resultImage}>{item.image}</Text>
      
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultName}>{item.name}</Text>
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>{item.type.toUpperCase()}</Text>
          </View>
        </View>
        
        <Text style={styles.resultDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.resultMeta}>
          <Text style={styles.category}>{item.category}</Text>
          <View style={styles.rating}>
            <Text style={styles.ratingText}>⭐ {item.rating}</Text>
          </View>
        </View>
        
        <View style={styles.resultFooter}>
          {item.price && (
            <Text style={styles.price}>₦{item.price.toLocaleString()}</Text>
          )}
          {item.distance && (
            <Text style={styles.distance}>{item.distance}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const filters = [
    { key: 'all', label: 'All', count: results.length },
    { key: 'products', label: 'Products', count: results.filter(r => r.type === 'product').length },
    { key: 'merchants', label: 'Merchants', count: results.filter(r => r.type === 'merchant').length },
    { key: 'services', label: 'Services', count: results.filter(r => r.type === 'service').length },
  ];

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
        <Text style={styles.headerTitle}>Search Results</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, merchants, services..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              activeFilter === filter.key && styles.activeFilterButton
            ]}
            onPress={() => setActiveFilter(filter.key as any)}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === filter.key && styles.activeFilterButtonText
              ]}
            >
              {filter.label} ({filter.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsHeader}>
          {loading ? 'Searching...' : `${results.length} results found`}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyDescription}>
              Try adjusting your search terms or filters
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            renderItem={renderResultItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
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
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: '#4682b4',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  searchButtonText: {
    fontSize: 18,
    color: '#ffffff',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeFilterButton: {
    backgroundColor: '#4682b4',
    borderColor: '#4682b4',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#ffffff',
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
  },
  resultsHeader: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131313',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  resultsList: {
    paddingBottom: 20,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultImage: {
    fontSize: 40,
    marginRight: 16,
    alignSelf: 'flex-start',
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131313',
    flex: 1,
    marginRight: 8,
  },
  typeTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  typeTagText: {
    fontSize: 10,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  resultDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    color: '#999',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#ffc107',
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4682b4',
  },
  distance: {
    fontSize: 12,
    color: '#666',
  },
});

export default SearchResultsScreen;
