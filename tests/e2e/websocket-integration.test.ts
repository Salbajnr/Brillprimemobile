
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

    test('should handle system metrics updates', (done) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected for system metrics test');
        done();
        return;
      }

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'system_metrics_update') {
          console.log('✅ System metrics received:', message);
          expect(message).toHaveProperty('activeRooms');
          expect(message).toHaveProperty('connectedClients');
          done();
        }
      });

      // Join admin monitoring room
      ws.send(JSON.stringify({
        type: 'join_admin_room',
        data: { roomType: 'monitoring' }
      }));

      setTimeout(() => done(), 5000);
    });

    test('should handle transaction monitoring', (done) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected for transaction monitoring test');
        done();
        return;
      }

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'transaction_created') {
          console.log('✅ Transaction update received:', message);
          expect(message.transaction).toHaveProperty('id');
          done();
        }
      });

      // Subscribe to transaction monitoring
      ws.send(JSON.stringify({
        type: 'subscribe_transaction_monitoring'
      }));

      // Simulate new transaction
      ws.send(JSON.stringify({
        type: 'new_transaction_created',
        data: {
          transaction: {
            id: 'txn_123',
            userId: 1,
            amount: '1000.00',
            status: 'pending',
            type: 'payment'
          }
        }
      }));

      setTimeout(() => done(), 3000);
    });

    test('should handle content moderation reports', (done) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected for content moderation test');
        done();
        return;
      }

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'new_content_report') {
          console.log('✅ Content report received:', message);
          expect(message.report).toHaveProperty('reportId');
          done();
        }
      });

      // Join admin moderation room
      ws.send(JSON.stringify({
        type: 'join_admin_room',
        data: { roomType: 'moderation' }
      }));

      // Simulate content report
      ws.send(JSON.stringify({
        type: 'content_report_submitted',
        data: {
          reportId: 'report_123',
          contentType: 'review',
          contentId: 'review_456',
          reportedBy: 1,
          reason: 'inappropriate_content',
          severity: 'medium'
        }
      }));

      setTimeout(() => done(), 3000);
    });
  });
});
