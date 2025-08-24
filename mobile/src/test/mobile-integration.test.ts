
import { apiService } from '../services/api';
import { mobileCacheService } from '../services/cache';
import { mobileOfflineService } from '../services/offline';

describe('Mobile Integration Tests', () => {
  beforeEach(() => {
    // Mock fetch for testing
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('API Service Integration', () => {
    it('should connect to backend API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { status: 'healthy' } })
      });

      const response = await apiService.healthCheck();
      expect(response.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith('http://0.0.0.0:5000/api/health', expect.any(Object));
    });

    it('should handle authentication flow', async () => {
      const mockUser = { id: 1, email: 'test@example.com', token: 'test-token' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockUser })
      });

      const response = await apiService.signIn({
        email: 'test@example.com',
        password: 'password'
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockUser);
    });
  });

  describe('Cache Service Integration', () => {
    it('should cache and retrieve data', async () => {
      const testData = { id: 1, name: 'Test Data' };
      
      await mobileCacheService.set('test-key', testData);
      const cached = await mobileCacheService.get('test-key');
      
      expect(cached).toEqual(testData);
    });

    it('should handle cache expiration', async () => {
      const testData = { id: 1, name: 'Test Data' };
      
      // Set with very short TTL
      await mobileCacheService.set('test-key', testData, 1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2));
      
      const cached = await mobileCacheService.get('test-key');
      expect(cached).toBeNull();
    });
  });

  describe('Offline Service Integration', () => {
    it('should queue offline actions', async () => {
      await mobileOfflineService.queueAction({
        type: 'CREATE',
        endpoint: '/orders',
        data: { type: 'fuel', amount: 100 }
      });

      const count = await mobileOfflineService.getQueuedActionsCount();
      expect(count).toBeGreaterThan(0);
    });
  });
});
