import request from 'supertest';
import { createServer } from '../../server/routes';

// Mock the storage
const mockStorage = {
  getUser: jest.fn(),
  getUserByUsername: jest.fn(),
  createUser: jest.fn(),
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getCartItems: jest.fn(),
  addToCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeFromCart: jest.fn(),
  getConversations: jest.fn(),
  createConversation: jest.fn(),
  getMessages: jest.fn(),
  sendMessage: jest.fn(),
  getVendorPosts: jest.fn(),
  createVendorPost: jest.fn(),
  likeVendorPost: jest.fn(),
  addToWishlist: jest.fn(),
  removeFromWishlist: jest.fn(),
  getWishlistItems: jest.fn()
};

jest.mock('../../server/storage', () => ({
  storage: mockStorage
}));

describe('API Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createServer();
    jest.clearAllMocks();
  });

  describe('Product Routes', () => {
    test('GET /api/products should return products', async () => {
      const mockProducts = [
        { id: '1', name: 'Test Product', price: '100' }
      ];
      
      mockStorage.getProducts.mockResolvedValue(mockProducts);

      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toEqual(mockProducts);
    });

    test('GET /api/categories should return categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Test Category', slug: 'test-category' }
      ];
      
      mockStorage.getCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.categories).toEqual(mockCategories);
    });
  });

  describe('Cart Routes', () => {
    test('POST /api/cart should add item to cart', async () => {
      const cartItem = {
        userId: 1,
        productId: 'prod-1',
        quantity: 2
      };

      const createdItem = { id: 1, ...cartItem, createdAt: new Date() };
      mockStorage.addToCart.mockResolvedValue(createdItem);

      const response = await request(app)
        .post('/api/cart')
        .send(cartItem)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cartItem).toEqual(createdItem);
    });

    test('GET /api/cart/:userId should return cart items', async () => {
      const mockCartItems = [
        { id: 1, userId: 1, productId: 'prod-1', quantity: 2 }
      ];
      
      mockStorage.getCartItems.mockResolvedValue(mockCartItems);

      const response = await request(app)
        .get('/api/cart/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cartItems).toEqual(mockCartItems);
    });
  });

  describe('Chat Routes', () => {
    test('GET /api/conversations should return conversations', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          customerName: 'Test Customer',
          vendorName: 'Test Vendor'
        }
      ];
      
      mockStorage.getConversations.mockResolvedValue(mockConversations);

      const response = await request(app)
        .get('/api/conversations?userId=1')
        .expect(200);

      expect(response.body).toEqual(mockConversations);
    });

    test('GET /api/conversations/:id/messages should return messages', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Test message',
          senderId: 1
        }
      ];
      
      mockStorage.getMessages.mockResolvedValue(mockMessages);

      const response = await request(app)
        .get('/api/conversations/conv-1/messages')
        .expect(200);

      expect(response.body).toEqual(mockMessages);
    });

    test('POST /api/messages should require authentication', async () => {
      const message = {
        conversationId: 'conv-1',
        content: 'Test message'
      };

      const response = await request(app)
        .post('/api/messages')
        .send(message)
        .expect(401);

      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('Vendor Feed Routes', () => {
    test('GET /api/vendor-posts should return posts', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          title: 'Test Post',
          vendorName: 'Test Vendor'
        }
      ];
      
      mockStorage.getVendorPosts.mockResolvedValue(mockPosts);

      const response = await request(app)
        .get('/api/vendor-posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.posts).toEqual(mockPosts);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockStorage.getProducts.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/products')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch products');
    });

    test('should validate required parameters', async () => {
      const response = await request(app)
        .get('/api/conversations')
        .expect(400);

      expect(response.body.message).toBe('User ID required');
    });
  });
});