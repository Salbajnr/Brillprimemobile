
import { api } from '../hooks/api';

export interface AssignmentPreferences {
  maxDistance?: number;
  preferredVehicleType?: string;
  minRating?: number;
  excludeDrivers?: string[];
}

export interface AssignmentResult {
  success: boolean;
  driverId?: string;
  driverName?: string;
  estimatedArrival?: string;
  message?: string;
}

class AutoAssignmentService {
  // Request automatic driver assignment for an order
  async requestAssignment(orderId: string, preferences?: AssignmentPreferences): Promise<AssignmentResult> {
    try {
      const response = await api.post('/auto-assignment/request', {
        orderId,
        preferences
      });

      return response.data;
    } catch (error) {
      console.error('Auto assignment request failed:', error);
      return {
        success: false,
        message: 'Failed to request driver assignment'
      };
    }
  }

  // Get assignment status for an order
  async getAssignmentStatus(orderId: string) {
    try {
      const response = await api.get(`/auto-assignment/status/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get assignment status:', error);
      return {
        success: false,
        message: 'Failed to get assignment status'
      };
    }
  }

  // Cancel assignment request
  async cancelAssignment(orderId: string) {
    try {
      const response = await api.post(`/auto-assignment/cancel/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to cancel assignment:', error);
      return {
        success: false,
        message: 'Failed to cancel assignment'
      };
    }
  }

  // For drivers: Get available orders
  async getAvailableOrders() {
    try {
      const response = await api.get('/auto-assignment/available-orders');
      return response.data;
    } catch (error) {
      console.error('Failed to get available orders:', error);
      return {
        success: false,
        orders: [],
        message: 'Failed to get available orders'
      };
    }
  }

  // For drivers: Accept an order
  async acceptOrder(orderId: string) {
    try {
      const response = await api.post(`/auto-assignment/accept/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to accept order:', error);
      return {
        success: false,
        message: 'Failed to accept order'
      };
    }
  }

  // For drivers: Update availability status
  async updateAvailability(isAvailable: boolean) {
    try {
      const response = await api.post('/auto-assignment/availability', {
        isAvailable
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update availability:', error);
      return {
        success: false,
        message: 'Failed to update availability'
      };
    }
  }
}

export const autoAssignmentService = new AutoAssignmentService();
