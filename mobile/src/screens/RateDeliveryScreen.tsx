
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../hooks/api';

interface RouteParams {
  orderId: string;
}

export default function RateDeliveryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params as RouteParams;
  
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/delivery-feedback', {
        orderId,
        rating,
        feedback: feedback.trim() || undefined
      });

      if (response.data.success) {
        Alert.alert(
          'Thank you!', 
          'Your rating has been submitted successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.data.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Rating submission error:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Text style={[
              styles.star,
              { color: star <= rating ? '#FFD700' : '#DDD' }
            ]}>
              ⭐
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Delivery</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>How was your delivery experience?</Text>
        <Text style={styles.subtitle}>Order #{orderId}</Text>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Rate your experience:</Text>
          {renderStars()}
          
          {rating > 0 && (
            <Text style={styles.ratingText}>
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </Text>
          )}
        </View>

        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackLabel}>
            Additional feedback (optional):
          </Text>
          <TextInput
            style={styles.feedbackInput}
            multiline
            numberOfLines={4}
            placeholder="Tell us about your delivery experience..."
            value={feedback}
            onChangeText={setFeedback}
            maxLength={500}
          />
          <Text style={styles.charCount}>{feedback.length}/500</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { opacity: rating === 0 || loading ? 0.5 : 1 }
          ]}
          onPress={handleSubmitRating}
          disabled={rating === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Rating</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    color: '#3B82F6',
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  starButton: {
    padding: 5,
  },
  star: {
    fontSize: 40,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#059669',
    marginTop: 10,
  },
  feedbackSection: {
    marginBottom: 30,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#FFF',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#059669',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
