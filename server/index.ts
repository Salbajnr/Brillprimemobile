
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { validateEnv } from './env-validation';

// Route imports
import authRoutes from './routes/auth';
import paymentsRoutes from './routes/payments';
import walletRoutes from './routes/wallet';
import productsRoutes from './routes/products';
import analyticsRoutes from './routes/analytics';
import driverRoutes from './routes/driver';
import supportRoutes from './routes/support';
import adminSupportRoutes from './routes/admin-support';
import enhancedVerificationRoutes from './routes/enhanced-verification';
import mfaAuthenticationRoutes from './routes/mfa-authentication';
import realTimeTrackingRoutes from './routes/real-time-tracking';
import driverLocationRoutes from './routes/driver-location';
import activeOrdersRoutes from './routes/active-orders';
import qrProcessingRoutes from './routes/qr-processing';
import paystackWebhooksRoutes from './routes/paystack-webhooks';
import escrowManagementRoutes from './routes/escrow-management';
import withdrawalSystemRoutes from './routes/withdrawal-system';

// Validate environment variables
validateEnv();

const app = express();
const server = createServer(app);

// Initialize Socket.IO with enhanced configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://your-domain.com"] 
      : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make io available globally for route handlers
declare global {
  var io: SocketIOServer;
}
global.io = io;

// Enhanced Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // User authentication and room joining
  socket.on('authenticate', (userData) => {
    if (userData.userId) {
      socket.join(`user_${userData.userId}`);
      
      // Join role-specific rooms
      if (userData.role === 'ADMIN') {
        socket.join('admin_dashboard');
        socket.join('admin_orders');
        socket.join('admin_tracking');
        socket.join('admin_verification');
        socket.join('admin_kyc');
      } else if (userData.role === 'DRIVER') {
        socket.join('drivers');
        socket.join(`driver_${userData.userId}`);
      } else if (userData.role === 'MERCHANT') {
        socket.join('merchants');
        socket.join(`merchant_${userData.userId}`);
      }
      
      console.log(`User ${userData.userId} authenticated as ${userData.role}`);
    }
  });

  // Order tracking
  socket.on('join_order_tracking', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined order tracking: ${orderId}`);
  });

  // Driver location updates
  socket.on('driver_location_update', (data) => {
    // Broadcast to relevant order rooms
    if (data.activeOrders) {
      data.activeOrders.forEach((orderId: string) => {
        socket.to(`order_${orderId}`).emit('driver_location_update', {
          orderId,
          location: data.location,
          timestamp: data.timestamp
        });
      });
    }
    
    // Broadcast to admin
    socket.to('admin_tracking').emit('driver_location_update', data);
  });

  // Real-time chat
  socket.on('send_message', (data) => {
    const { recipientId, message, conversationId } = data;
    socket.to(`user_${recipientId}`).emit('new_message', {
      message,
      conversationId,
      timestamp: new Date().toISOString()
    });
  });

  // Support ticket updates
  socket.on('join_support_ticket', (ticketId) => {
    socket.join(`ticket_${ticketId}`);
  });

  // Payment status updates
  socket.on('join_payment_tracking', (paymentRef) => {
    socket.join(`payment_${paymentRef}`);
  });

  // Wallet updates
  socket.on('join_wallet_updates', (userId) => {
    socket.join(`wallet_${userId}`);
  });

  // Analytics subscription for admins
  socket.on('subscribe_analytics', () => {
    socket.join('analytics_updates');
  });

  // Disconnect handling
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://your-domain.com"] 
    : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));

// Enhanced session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  name: 'brillprime.sid'
}));

// Enhanced request logging
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.url} took ${duration}ms`);
    }
  });
  
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// WebSocket test endpoint
app.get('/api/ws-test', (req, res) => {
  const testData = {
    message: 'WebSocket test from server',
    timestamp: new Date().toISOString(),
    connectedClients: io.engine.clientsCount
  };
  
  io.emit('server_test', testData);
  
  res.json({
    success: true,
    message: 'WebSocket test broadcast sent',
    connectedClients: io.engine.clientsCount,
    data: testData
  });
});

// API Routes with enhanced error handling
const apiRouter = express.Router();

// Centralized error handling for API routes
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Apply async error handling to all routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/payments', paymentsRoutes);
apiRouter.use('/wallet', walletRoutes);
apiRouter.use('/products', productsRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/drivers', driverRoutes);
apiRouter.use('/support', supportRoutes);
apiRouter.use('/admin-support', adminSupportRoutes);
apiRouter.use('/verification-enhanced', enhancedVerificationRoutes);
apiRouter.use('/mfa', mfaAuthenticationRoutes);
apiRouter.use('/tracking', realTimeTrackingRoutes);
apiRouter.use('/driver-location', driverLocationRoutes);
apiRouter.use('/active-orders', activeOrdersRoutes);
apiRouter.use('/qr-processing', qrProcessingRoutes);
apiRouter.use('/paystack-webhooks', paystackWebhooksRoutes);
apiRouter.use('/escrow', escrowManagementRoutes);
apiRouter.use('/withdrawal', withdrawalSystemRoutes);

app.use('/api', apiRouter);

// Enhanced error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  
  // Log error details
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString(),
    userId: req.session?.userId
  };
  
  // In production, you would send this to a logging service
  console.error('Error details:', errorDetails);
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;
  
  res.status(error.status || 500).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Enhanced server startup
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BrillPrime server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket server enabled`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔐 Session secret: ${process.env.SESSION_SECRET ? 'Configured' : 'Using default'}`);
  
  // Real-time system health monitoring
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
    };
    
    // Log memory usage if it's high
    if (memUsageMB.heapUsed > 100) {
      console.warn('High memory usage:', memUsageMB);
    }
    
    // Broadcast system health to admin clients
    io.to('admin_dashboard').emit('system_health', {
      memory: memUsageMB,
      uptime: process.uptime(),
      connectedClients: io.engine.clientsCount,
      timestamp: new Date().toISOString()
    });
  }, 30000); // Every 30 seconds
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Unhandled promise rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

export default app;
