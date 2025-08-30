
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../hooks/api';
import { useAuth } from '../hooks/useAuth';

interface Rating {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  customerName: string;
  orderId: number;
}

interface RatingSummary {
  averageRating: number;
  totalRatings: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function MerchantRatingsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMerchantRatings();
  }, []);

  const fetchMerchantRatings = async () => {
    if (!user?.id) return;

    try {
      const response = await api.get(`/ratings/merchant/${user.id}/summary`);
      if (response.data.success) {
        setSummary(response.data.data.summary);
        setRatings(response.data.data.recentRatings);
      }
    } catch (error) {
      console.error('Failed to fetch merchant ratings:', error);
      Alert.alert('Error', 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Text
        key={index}
        style={[
          styles.star,
          { color: index < rating ? '#FFD700' : '#DDD' }
        ]}
      >
        ⭐
      </Text>
    ));
  };

  const renderRatingBar = (stars: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <View style={styles.ratingBarContainer} key={stars}>
        <Text style={styles.ratingBarLabel}>{stars}★</Text>
        <View style={styles.ratingBarBackground}>
          <View 
            style={[styles.ratingBarFill, { width: `${percentage}%` }]}
          />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading ratings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Ratings</Text>
      </View>

      {summary && (
        <>
          {/* Overall Rating Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Overall Rating</Text>
            <View style={styles.overallRating}>
              <Text style={styles.ratingNumber}>
                {summary.averageRating.toFixed(1)}
              </Text>
              <View style={styles.starsContainer}>
                {renderStars(Math.round(summary.averageRating))}
              </View>
              <Text style={styles.totalReviews}>
                Based on {summary.totalRatings} reviews
              </Text>
            </View>
          </View>

          {/* Rating Breakdown */}
          <View style={styles.breakdownCard}>
            <Text style={styles.cardTitle}>Rating Breakdown</Text>
            <View style={styles.breakdownContent}>
              {[5, 4, 3, 2, 1].map(stars => 
                renderRatingBar(stars, summary.breakdown[stars as keyof typeof summary.breakdown], summary.totalRatings)
              )}
            </View>
          </View>
        </>
      )}

      {/* Recent Reviews */}
      <View style={styles.reviewsCard}>
        <Text style={styles.cardTitle}>Recent Reviews</Text>
        {ratings.length > 0 ? (
          <View style={styles.reviewsList}>
            {ratings.map((rating) => (
              <View key={rating.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>{rating.customerName}</Text>
                    <View style={styles.reviewStars}>
                      {renderStars(rating.rating)}
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(rating.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {rating.comment && (
                  <Text style={styles.reviewComment}>{rating.comment}</Text>
                )}
                <Text style={styles.orderNumber}>Order #{rating.orderId}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noReviews}>
            <Text style={styles.noReviewsText}>No reviews yet</Text>
            <Text style={styles.noReviewsSubtext}>
              Complete more orders to receive customer feedback
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 16,
    color: '#059669',
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewsCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 15,
  },
  overallRating: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  star: {
    fontSize: 24,
    marginHorizontal: 2,
  },
  totalReviews: {
    fontSize: 14,
    color: '#6B7280',
  },
  breakdownContent: {
    gap: 8,
  },
  ratingBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ratingBarLabel: {
    width: 30,
    fontSize: 14,
    fontWeight: '500',
  },
  ratingBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  ratingBarCount: {
    width: 30,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
  },
  reviewsList: {
    gap: 16,
  },
  reviewItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reviewComment: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  orderNumber: {
    fontSize: 12,
    color: '#6B7280',
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noReviewsText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
