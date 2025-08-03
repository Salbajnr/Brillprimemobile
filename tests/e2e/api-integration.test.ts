
import { describe, test, expect, beforeAll } from '@jest/globals';
import fetch from 'node-fetch';

describe('API Integration E2E Tests', () => {
  const API_URL = 'http://0.0.0.0:5000';
  let authToken: string;

  beforeAll(async () => {
    // Setup test data if needed
    console.log('Setting up API integration tests...');
  });

  describe('Authentication API', () => {
    test('should handle user registration', async () => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test-e2e@example.com',
          password: 'password123',
          fullName: 'E2E Test User',
          role: 'CONSUMER'
        })
      });

      expect(response.status).toBeLessThan(500);
      const data = await response.json();
      console.log('Registration response:', data);
    });

    test('should handle user login', async () => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      expect(response.status).toBeLessThan(500);
      const data = await response.json();
      console.log('Login response:', data);
      
      if (data.token) {
        authToken = data.token;
      }
    });
  });

  describe('Products API', () => {
    test('should fetch products', async () => {
      const response = await fetch(`${API_URL}/api/products`);
      
      expect(response.status).toBe(200);
      const products = await response.json();
      expect(Array.isArray(products)).toBe(true);
      console.log(`Found ${products.length} products`);
    });

    test('should fetch product categories', async () => {
      const response = await fetch(`${API_URL}/api/categories`);
      
      expect(response.status).toBe(200);
      const categories = await response.json();
      expect(Array.isArray(categories)).toBe(true);
      console.log(`Found ${categories.length} categories`);
    });
  });

  describe('Chat API', () => {
    test('should fetch conversations', async () => {
      const response = await fetch(`${API_URL}/api/conversations?userId=1`);
      
      expect(response.status).toBeLessThan(500);
      const conversations = await response.json();
      console.log('Conversations response:', conversations);
    });

    test('should fetch messages', async () => {
      const response = await fetch(`${API_URL}/api/messages?conversationId=1`);
      
      expect(response.status).toBeLessThan(500);
      const messages = await response.json();
      console.log('Messages response:', messages);
    });
  });

  describe('Vendor Feed API', () => {
    test('should fetch vendor posts', async () => {
      const response = await fetch(`${API_URL}/api/vendor-posts`);
      
      expect(response.status).toBeLessThan(500);
      const posts = await response.json();
      console.log('Vendor posts response:', posts);
    });
  });

  describe('Admin API', () => {
    test('should handle admin authentication', async () => {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@brillprime.com',
          password: 'admin123'
        })
      });

      expect(response.status).toBeLessThan(500);
      const data = await response.json();
      console.log('Admin login response:', data);
    });

    test('should fetch admin users', async () => {
      const response = await fetch(`${API_URL}/api/admin/users`);
      
      expect(response.status).toBeLessThan(500);
      const users = await response.json();
      console.log('Admin users response:', users);
    });

    test('should fetch admin transactions', async () => {
      const response = await fetch(`${API_URL}/api/admin/transactions`);
      
      expect(response.status).toBeLessThan(500);
      const transactions = await response.json();
      console.log('Admin transactions response:', transactions);
    });

    test('should fetch fraud alerts', async () => {
      const response = await fetch(`${API_URL}/api/admin/fraud/alerts`);
      
      expect(response.status).toBeLessThan(500);
      const alerts = await response.json();
      console.log('Fraud alerts response:', alerts);
    });

    test('should fetch monitoring data', async () => {
      const response = await fetch(`${API_URL}/api/admin/monitoring/drivers`);
      
      expect(response.status).toBeLessThan(500);
      const drivers = await response.json();
      console.log('Monitoring drivers response:', drivers);
    });
  });

  describe('Payment API', () => {
    test('should handle payment initialization', async () => {
      const response = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 1000,
          email: 'test@example.com',
          currency: 'NGN'
        })
      });

      expect(response.status).toBeLessThan(500);
      const payment = await response.json();
      console.log('Payment initialization response:', payment);
    });
  });
});
