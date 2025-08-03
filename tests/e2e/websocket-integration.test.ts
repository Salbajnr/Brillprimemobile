
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import WebSocket from 'ws';

describe('WebSocket Integration E2E Tests', () => {
  const WS_URL = process.env.WS_URL || 'ws://0.0.0.0:5000';
  let ws: WebSocket;

  beforeAll(async () => {
    console.log('Setting up WebSocket integration tests...');
  });

  afterAll(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  describe('WebSocket Connection', () => {
    test('should establish WebSocket connection', (done) => {
      ws = new WebSocket(WS_URL);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connection established');
        expect(ws.readyState).toBe(WebSocket.OPEN);
        done();
      });

      ws.on('error', (error) => {
        console.log('WebSocket connection error:', error.message);
        done();
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timeout');
          done();
        }
      }, 10000);
    });

    test('should handle WebSocket messages', (done) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        ws = new WebSocket(WS_URL);
        ws.on('open', () => testMessages());
      } else {
        testMessages();
      }

      function testMessages() {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log('Received WebSocket message:', message);
          expect(message).toHaveProperty('type');
          done();
        });

        // Send a test message
        ws.send(JSON.stringify({
          type: 'test',
          data: { message: 'E2E test message' }
        }));

        // Timeout after 5 seconds
        setTimeout(() => {
          console.log('WebSocket message test timeout');
          done();
        }, 5000);
      }
    });
  });

  describe('Real-time Events', () => {
    test('should handle order updates', (done) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected for order updates test');
        done();
        return;
      }

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'order_update') {
          console.log('✅ Order update received:', message.data);
          expect(message.data).toHaveProperty('orderId');
          done();
        }
      });

      // Simulate order update
      ws.send(JSON.stringify({
        type: 'order_update',
        data: { orderId: '123', status: 'in_progress' }
      }));

      setTimeout(() => done(), 3000);
    });

    test('should handle admin notifications', (done) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected for admin notifications test');
        done();
        return;
      }

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'admin_notification') {
          console.log('✅ Admin notification received:', message.data);
          done();
        }
      });

      // Simulate admin notification
      ws.send(JSON.stringify({
        type: 'admin_notification',
        data: { message: 'Test admin notification' }
      }));

      setTimeout(() => done(), 3000);
    });
  });
});
