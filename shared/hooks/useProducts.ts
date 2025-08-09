
import { useState, useCallback, useEffect } from 'react';
import { ApiService } from '../api/apiService';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  categoryId: number;
  sellerId: number;
  image?: string;
  inStock: boolean;
  minimumOrder: number;
  unit: string;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  categoryId?: number;
  sellerId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'rating' | 'recent';
}

export function useProducts(apiService: ApiService, filters?: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (newFilters?: ProductFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      // Merge filters with defaults
      const queryFilters = { ...filters, ...newFilters };
      
      // Convert filters to query string
      const queryParams = new URLSearchParams();
      Object.entries(queryFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await apiService.getProducts();
      
      if (response.success && response.data) {
        setProducts(response.data.products || response.data);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        setError(response.error || 'Failed to fetch products');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [apiService, filters]);

  const getProductById = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getProductById(productId);
      
      if (response.success && response.data) {
        return { success: true, product: response.data };
      } else {
        setError(response.error || 'Failed to fetch product');
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch product';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Auto-fetch products on mount or filter change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    pagination,
    loading,
    error,
    fetchProducts,
    getProductById,
    refresh: fetchProducts,
  };
}
