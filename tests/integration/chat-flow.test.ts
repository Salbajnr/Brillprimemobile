import request from 'supertest';
import { createServer } from '../../server/routes';

describe('Chat Integration Tests', () => {
  let app: any;

  beforeEach(() => {
    app = createServer();
  });

  test('should complete full chat flow', async () => {
    // 1. Get conversations
    const conversationsResponse = await request(app)
      .get('/api/conversations?userId=1')
      .expect(200);

    expect(Array.isArray(conversationsResponse.body)).toBe(true);
    expect(conversationsResponse.body.length).toBeGreaterThan(0);

    const conversation = conversationsResponse.body[0];
    expect(conversation).toHaveProperty('id');
    expect(conversation).toHaveProperty('customerName');
    expect(conversation).toHaveProperty('vendorName');

    // 2. Get messages for conversation
    const messagesResponse = await request(app)
      .get(`/api/conversations/${conversation.id}/messages`)
      .expect(200);

    expect(Array.isArray(messagesResponse.body)).toBe(true);
    expect(messagesResponse.body.length).toBeGreaterThan(0);

    const message = messagesResponse.body[0];
    expect(message).toHaveProperty('content');
    expect(message).toHaveProperty('senderName');
    expect(message).toHaveProperty('messageType');

    // 3. Verify message types are handled correctly
    const quoteMessage = messagesResponse.body.find(m => m.messageType === 'QUOTE_REQUEST');
    const responseMessage = messagesResponse.body.find(m => m.messageType === 'QUOTE_RESPONSE');

    if (quoteMessage) {
      expect(quoteMessage.content).toBeTruthy();
      expect(quoteMessage.senderName).toBeTruthy();
    }

    if (responseMessage) {
      expect(responseMessage.content).toBeTruthy();
      expect(responseMessage.attachedData).toBeTruthy();
      expect(responseMessage.attachedData.originalPrice).toBeDefined();
      expect(responseMessage.attachedData.discountPrice).toBeDefined();
    }
  });

  test('should handle conversation creation', async () => {
    const newConversation = {
      customerId: 1,
      vendorId: 2,
      productId: 'test-product-id',
      conversationType: 'QUOTE'
    };

    // Note: This would normally require authentication
    // In a real test, we'd set up a proper session first
    const response = await request(app)
      .post('/api/conversations')
      .send(newConversation)
      .expect(401); // Expecting authentication error

    expect(response.body.message).toBe('Authentication required');
  });

  test('should validate conversation parameters', async () => {
    const response = await request(app)
      .get('/api/conversations')
      .expect(400);

    expect(response.body.message).toBe('User ID required');
  });

  test('should handle message type indicators', async () => {
    const messagesResponse = await request(app)
      .get('/api/conversations/conv-1/messages')
      .expect(200);

    const messages = messagesResponse.body;
    
    // Check that different message types are properly structured
    const messageTypes = ['TEXT', 'QUOTE_REQUEST', 'QUOTE_RESPONSE'];
    const foundTypes = messages.map(m => m.messageType);
    
    expect(foundTypes.some(type => messageTypes.includes(type))).toBe(true);
  });

  test('should maintain conversation context', async () => {
    const conversationsResponse = await request(app)
      .get('/api/conversations?userId=1')
      .expect(200);

    const conversations = conversationsResponse.body;
    
    // Verify conversations have product context
    const conversationWithProduct = conversations.find(c => c.productId);
    if (conversationWithProduct) {
      expect(conversationWithProduct.productName).toBeTruthy();
      expect(conversationWithProduct.conversationType).toMatch(/QUOTE|ORDER|GENERAL/);
    }
  });
});