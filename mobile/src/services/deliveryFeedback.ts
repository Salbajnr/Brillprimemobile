
import { api } from '../hooks/api';

export interface DeliveryRating {
  orderId: string;
  rating: number;
  feedback?: string;
  driverRating?: number;
  driverFeedback?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  data?: any;
}

class DeliveryFeedbackService {
  // Submit delivery rating and feedback
  async submitRating(ratingData: DeliveryRating): Promise<FeedbackResponse> {
    try {
      const response = await api.post('/delivery-feedback', ratingData);
      return response.data;
    } catch (error) {
      console.error('Rating submission failed:', error);
      return {
        success: false,
        message: 'Failed to submit rating'
      };
    }
  }

  // Get feedback for a specific order
  async getOrderFeedback(orderId: string) {
    try {
      const response = await api.get(`/delivery-feedback/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get order feedback:', error);
      return {
        success: false,
        message: 'Failed to get order feedback'
      };
    }
  }

  // Get driver's feedback summary
  async getDriverFeedbackSummary(driverId: string) {
    try {
      const response = await api.get(`/delivery-feedback/driver/${driverId}/summary`);
      return response.data;
    } catch (error) {
      console.error('Failed to get driver feedback summary:', error);
      return {
        success: false,
        message: 'Failed to get driver feedback summary'
      };
    }
  }

  // Get customer's rating history
  async getCustomerRatingHistory() {
    try {
      const response = await api.get('/delivery-feedback/customer/history');
      return response.data;
    } catch (error) {
      console.error('Failed to get rating history:', error);
      return {
        success: false,
        ratings: [],
        message: 'Failed to get rating history'
      };
    }
  }

  // Report an issue with delivery
  async reportDeliveryIssue(orderId: string, issueType: string, description: string) {
    try {
      const response = await api.post('/delivery-feedback/report-issue', {
        orderId,
        issueType,
        description
      });
      return response.data;
    } catch (error) {
      console.error('Failed to report delivery issue:', error);
      return {
        success: false,
        message: 'Failed to report issue'
      };
    }
  }
}

export const deliveryFeedbackService = new DeliveryFeedbackService();
