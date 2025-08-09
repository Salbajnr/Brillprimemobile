
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useDispatch } from 'react-redux';

const VendorFeedScreen = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const dispatch = useDispatch();

  const tabs = [
    { id: 'all', name: 'All' },
    { id: 'promotions', name: 'Promotions' },
    { id: 'new-arrivals', name: 'New Arrivals' },
    { id: 'trending', name: 'Trending' },
  ];

  const feedItems = [
    {
      id: '1',
      type: 'promotion',
      vendor: 'Alaba Market Store',
      title: '20% Off All Rice Varieties',
      description: 'Get 20% discount on all rice varieties. Limited time offer!',
      originalPrice: 45000,
      discountedPrice: 36000,
      image: '🌾',
      timeAgo: '2 hours ago',
      likes: 34,
      comments: 8,
    },
    {
      id: '2',
      type: 'new-arrival',
      vendor: 'Fresh Produce Ltd',
      title: 'Fresh Tomatoes Available',
      description: 'Premium quality tomatoes just arrived from our farm.',
      price: 500,
      unit: 'kg',
      image: '🍅',
      timeAgo: '4 hours ago',
      likes: 28,
      comments: 12,
    },
    {
      id: '3',
      type: 'trending',
      vendor: 'Poultry Paradise',
      title: 'Free-Range Chicken',
      description: 'Organic, free-range chicken now available. Pre-order now!',
      price: 3500,
      unit: 'kg',
      image: '🐔',
      timeAgo: '6 hours ago',
      likes: 56,
      comments: 23,
    },
    {
      id: '4',
      type: 'promotion',
      vendor: 'Fruit Basket',
      title: 'Buy 2 Get 1 Free Bananas',
      description: 'Sweet, ripe bananas. Perfect for the family!',
      price: 300,
      unit: 'bunch',
      image: '🍌',
      timeAgo: '8 hours ago',
      likes: 42,
      comments: 15,
    },
  ];

  const filteredItems = selectedTab === 'all' 
    ? feedItems 
    : feedItems.filter(item => item.type === selectedTab);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 2000);
  };

  const handleLike = (itemId: string) => {
    // Simulate like functionality
    console.log('Liked item:', itemId);
  };

  const handleComment = (itemId: string) => {
    // Navigate to comments screen or show comment modal
    console.log('Comment on item:', itemId);
  };

  const handleContact = (vendor: string) => {
    navigation.navigate('Chat', { vendorName: vendor });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vendor Feed</Text>
        <Text style={styles.subtitle}>Latest updates from vendors</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.selectedTab,
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.id && styles.selectedTabText,
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.feed}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredItems.map((item) => (
          <View key={item.id} style={styles.feedCard}>
            <View style={styles.feedHeader}>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{item.vendor}</Text>
                <Text style={styles.timeAgo}>{item.timeAgo}</Text>
              </View>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleContact(item.vendor)}
              >
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.feedContent}>
              <Text style={styles.feedImage}>{item.image}</Text>
              <View style={styles.feedDetails}>
                <Text style={styles.feedTitle}>{item.title}</Text>
                <Text style={styles.feedDescription}>{item.description}</Text>
                
                {item.type === 'promotion' && item.discountedPrice ? (
                  <View style={styles.priceContainer}>
                    <Text style={styles.originalPrice}>
                      ₦{item.originalPrice?.toLocaleString()}
                    </Text>
                    <Text style={styles.discountedPrice}>
                      ₦{item.discountedPrice.toLocaleString()}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.price}>
                    ₦{item.price?.toLocaleString()}{item.unit ? `/${item.unit}` : ''}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.feedActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLike(item.id)}
              >
                <Text style={styles.actionText}>👍 {item.likes}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleComment(item.id)}
              >
                <Text style={styles.actionText}>💬 {item.comments}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Commodities')}
              >
                <Text style={styles.actionText}>🛒 Order</Text>
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
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  tabs: {
    paddingVertical: 15,
    paddingLeft: 20,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedTab: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTabText: {
    color: 'white',
  },
  feed: {
    flex: 1,
    padding: 20,
  },
  feedCard: {
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
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeAgo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  contactButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  feedContent: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  feedImage: {
    fontSize: 48,
    marginRight: 15,
  },
  feedDetails: {
    flex: 1,
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  feedDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  feedActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
});

export default VendorFeedScreen;
