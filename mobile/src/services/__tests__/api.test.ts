
import { apiService } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('Authentication', () => {
    test('should sign in successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: 1, email: 'test@example.com', fullName: 'Test User' },
          token: 'mock-token',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'userSession',
        JSON.stringify(mockResponse.data)
      );
    });

    test('should handle sign in failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.signIn({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    test('should sign up successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: 1, email: 'new@example.com', fullName: 'New User' },
          token: 'mock-token',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.signUp({
        fullName: 'New User',
        email: 'new@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
    });
  });

  describe('API Requests', () => {
    test('should handle network timeout', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      );

      const result = await apiService.get('/test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should include auth headers when user is signed in', async () => {
      await AsyncStorage.setItem(
        'userSession',
        JSON.stringify({ token: 'test-token' })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await apiService.get('/protected');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://0.0.0.0:5000/api/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('Order Management', () => {
    test('should create order successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        type: 'FUEL',
        amount: 10000,
        status: 'PENDING',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ success: true, data: mockOrder }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.createOrder({
        type: 'FUEL',
        amount: 10000,
        quantity: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOrder);
    });

    test('should get orders with pagination', async () => {
      const mockOrders = {
        orders: [
          { id: 'order-1', type: 'FUEL', amount: 5000 },
          { id: 'order-2', type: 'TOLL', amount: 200 },
        ],
        total: 2,
        page: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockOrders }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.getOrders({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOrders);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://0.0.0.0:5000/api/orders?page=1&limit=10',
        expect.any(Object)
      );
    });
  });

  describe('Wallet Operations', () => {
    test('should get wallet balance', async () => {
      const mockBalance = { balance: 50000, currency: 'NGN' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockBalance }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.getWalletBalance();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBalance);
    });

    test('should transfer money successfully', async () => {
      const transferData = {
        recipientEmail: 'recipient@example.com',
        amount: 5000,
        description: 'Test transfer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { transactionId: 'tx-123' } }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiService.transferMoney(transferData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ transactionId: 'tx-123' });
    });
  });
});
