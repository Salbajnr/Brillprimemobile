import { DatabaseStorage } from '../../server/storage';
import { db } from '../../server/db';

// Mock the database
jest.mock('../../server/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  }
}));

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    storage = new DatabaseStorage();
    jest.clearAllMocks();
  });

  describe('User Operations', () => {
    test('should get user by id', async () => {
      const mockUser = {
        id: 1,
        fullName: 'Test User',
        email: 'test@example.com',
        role: 'CONSUMER'
      };

      (db.select().from as jest.Mock).mockResolvedValue([mockUser]);

      const result = await storage.getUser(1);
      expect(result).toEqual(mockUser);
      expect(db.select).toHaveBeenCalled();
    });

    test('should return undefined for non-existent user', async () => {
      (db.select().from as jest.Mock).mockResolvedValue([]);

      const result = await storage.getUser(999);
      expect(result).toBeUndefined();
    });

    test('should create user successfully', async () => {
      const newUser = {
        fullName: 'New User',
        email: 'new@example.com',
        password: 'hashedpassword',
        phone: '1234567890',
        role: 'CONSUMER' as const
      };

      const createdUser = { id: 1, ...newUser };
      (db.insert().values().returning as jest.Mock).mockResolvedValue([createdUser]);

      const result = await storage.createUser(newUser);
      expect(result).toEqual(createdUser);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('Product Operations', () => {
    test('should get products with filters', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Test Product',
          price: '100',
          categoryId: 1
        }
      ];

      // Mock the complex query chain
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockProducts)
      };

      (db.select as jest.Mock).mockReturnValue(mockQuery);

      const result = await storage.getProducts({ limit: 10, offset: 0 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Cart Operations', () => {
    test('should add item to cart', async () => {
      const cartItem = {
        userId: 1,
        productId: 'prod-1',
        quantity: 2
      };

      const createdItem = { id: 1, ...cartItem, createdAt: new Date() };
      (db.insert().values().returning as jest.Mock).mockResolvedValue([createdItem]);

      const result = await storage.addToCart(cartItem);
      expect(result).toEqual(createdItem);
    });

    test('should get cart items for user', async () => {
      const mockCartItems = [
        {
          id: 1,
          userId: 1,
          productId: 'prod-1',
          quantity: 2
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockCartItems)
      };

      (db.select as jest.Mock).mockReturnValue(mockQuery);

      const result = await storage.getCartItems(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Chat Operations', () => {
    test('should get conversations for user', async () => {
      const result = await storage.getConversations(1);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('customerName');
      expect(result[0]).toHaveProperty('vendorName');
    });

    test('should get messages for conversation', async () => {
      const result = await storage.getMessages('conv-1');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('content');
      expect(result[0]).toHaveProperty('messageType');
    });

    test('should send message', async () => {
      const message = {
        conversationId: 'conv-1',
        senderId: 1,
        content: 'Test message',
        messageType: 'TEXT' as const
      };

      const result = await storage.sendMessage(message);
      expect(result).toHaveProperty('id');
      expect(result.content).toBe(message.content);
      expect(result.senderId).toBe(message.senderId);
    });

    test('should create conversation', async () => {
      const conversation = {
        customerId: 1,
        vendorId: 2,
        productId: 'prod-1',
        conversationType: 'QUOTE' as const
      };

      const result = await storage.createConversation(conversation);
      expect(result).toHaveProperty('id');
      expect(result.customerId).toBe(conversation.customerId);
      expect(result.vendorId).toBe(conversation.vendorId);
    });
  });

  describe('Vendor Feed Operations', () => {
    test('should get vendor posts', async () => {
      const result = await storage.getVendorPosts({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('vendorName');
    });

    test('should create vendor post', async () => {
      const post = {
        vendorId: 1,
        title: 'Test Post',
        content: 'Test content',
        postType: 'NEW_PRODUCT' as const
      };

      const result = await storage.createVendorPost(post);
      expect(result).toHaveProperty('id');
      expect(result.title).toBe(post.title);
      expect(result.vendorId).toBe(post.vendorId);
    });
  });
});