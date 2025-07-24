import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Business, Product, Order, Analytics, BusinessSummary } from './types';

// Base API configuration
const API_BASE = '/api'; // Adjust this to match your API base URL

// Custom fetch function for API calls
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Business hooks
export function useBusiness(businessId: number) {
  return useQuery({
    queryKey: ['/api/business', businessId],
    queryFn: () => apiRequest<Business>(`/business/${businessId}`),
    enabled: !!businessId,
  });
}

export function useBusinessSummary(businessId: number) {
  return useQuery({
    queryKey: ['/api/dashboard/business', businessId],
    queryFn: () => apiRequest<BusinessSummary>(`/dashboard/business/${businessId}`),
    enabled: !!businessId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useDashboardData(businessId: number) {
  return useQuery({
    queryKey: ['/api/dashboard/business', businessId],
    queryFn: () => apiRequest<BusinessSummary>(`/dashboard/business/${businessId}`),
    enabled: !!businessId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Product hooks
export function useProducts(businessId: number) {
  return useQuery({
    queryKey: ['/api/products/business', businessId],
    queryFn: () => apiRequest<Product[]>(`/products/business/${businessId}`),
    enabled: !!businessId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (product: any) => apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, updates }: { productId: string; updates: any }) => 
      apiRequest(`/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productId: string) => 
      apiRequest(`/products/${productId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
  });
}

// Order hooks
export function useOrders(businessId: number) {
  return useQuery({
    queryKey: ['/api/orders/business', businessId],
    queryFn: () => apiRequest<Order[]>(`/orders/business/${businessId}`),
    enabled: !!businessId,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });
}

export function useOrdersByStatus(businessId: number, status: string) {
  return useQuery({
    queryKey: ['/api/orders/business', businessId, 'status', status],
    queryFn: () => apiRequest<Order[]>(`/orders/business/${businessId}/status/${status}`),
    enabled: !!businessId && !!status,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiRequest(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (order: any) => apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
  });
}

// Analytics hooks
export function useAnalytics(businessId: number, timeframe: string = 'month') {
  return useQuery({
    queryKey: ['/api/analytics/business', businessId, timeframe],
    queryFn: () => apiRequest<Analytics[]>(`/analytics/business/${businessId}/${timeframe}`),
    enabled: !!businessId,
  });
}

// Utility hooks
export function useBusinessId(): number {
  // In a real app, this would come from authentication context
  // For now, return a default business ID
  return 1;
}

// Real-time hooks for live updates
export function useOrderUpdates(businessId: number) {
  return useQuery({
    queryKey: ['/api/orders/updates', businessId],
    queryFn: () => apiRequest<Order[]>(`/orders/business/${businessId}`),
    enabled: !!businessId,
    refetchInterval: 5000, // Very frequent updates for driver tracking
  });
}

export function useDriverLocation(driverId: number) {
  return useQuery({
    queryKey: ['/api/drivers/location', driverId],
    queryFn: () => apiRequest(`/drivers/${driverId}/location`),
    enabled: !!driverId,
    refetchInterval: 15000, // Update driver location every 15 seconds
  });
}