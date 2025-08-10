
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Test WebSocket connection endpoint
router.get('/test', authenticateToken, (req, res) => {
  const io = (global as any).io;
  
  if (!io) {
    return res.status(500).json({
      success: false,
      message: 'WebSocket server not initialized'
    });
  }

  // Send test message to user
  const userId = req.user?.id;
  if (userId) {
    io.to(`user_${userId}`).emit('test_notification', {
      type: 'TEST',
      title: 'WebSocket Test',
      message: 'WebSocket connection is working properly!',
      timestamp: Date.now()
    });
  }

  // Get connection stats
  const connectedSockets = io.sockets.sockets.size;
  const rooms = Array.from(io.sockets.adapter.rooms.keys());

  res.json({
    success: true,
    message: 'WebSocket test completed',
    stats: {
      connectedSockets,
      totalRooms: rooms.length,
      testSent: !!userId
    }
  });
});

// Get WebSocket status
router.get('/status', (req, res) => {
  const io = (global as any).io;
  
  if (!io) {
    return res.status(500).json({
      success: false,
      message: 'WebSocket server not initialized'
    });
  }

  const connectedSockets = io.sockets.sockets.size;
  const rooms = Array.from(io.sockets.adapter.rooms.keys());
  const adminRooms = rooms.filter(room => room.startsWith('admin_'));
  const userRooms = rooms.filter(room => room.startsWith('user_'));
  const orderRooms = rooms.filter(room => room.startsWith('order_'));

  res.json({
    success: true,
    status: 'active',
    stats: {
      connectedSockets,
      totalRooms: rooms.length,
      adminRooms: adminRooms.length,
      userRooms: userRooms.length,
      orderRooms: orderRooms.length
    },
    rooms: {
      admin: adminRooms.slice(0, 10), // Show first 10
      user: userRooms.slice(0, 10),
      order: orderRooms.slice(0, 10)
    }
  });
});

export default router;
