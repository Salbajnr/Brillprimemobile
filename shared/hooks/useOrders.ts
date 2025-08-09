
import { useState, useCallback, useEffect } from 'react';
import { ApiService } from '../api/apiService';

export interface Order {
  id: string;
  customerId: number;
  merchantId: number;
  driverId?: number;
  items: OrderItem[];
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  totalAmount: string;
  deliveryAddress: string;
  createdAt: string;
  updatedAt: string;
  estimatedDeliveryTime?: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: string;
  totalPrice: string;
}

export function useOrders(apiService: ApiService) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getOrders();
      
      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        setError(response.error || 'Failed to fetch orders');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  const createOrder = useCallback(async (orderData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.createOrder(orderData);
      
      if (response.success && response.data) {
        setOrders(prev => [response.data, ...prev]);
        return { success: true, order: response.data };
      } else {
        setError(response.error || 'Failed to create order');
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create order';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  const getOrderById = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getOrderById(orderId);
      
      if (response.success && response.data) {
        return { success: true, order: response.data };
      } else {
        setError(response.error || 'Failed to fetch order');
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch order';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Auto-fetch orders on mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    getOrderById,
    refresh: fetchOrders,
  };
}
