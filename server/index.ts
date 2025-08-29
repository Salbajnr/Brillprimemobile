
import express, { Express, Request, Response } from "express";
import cors from "cors";
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

// Import environment validation
import './env-validation';
import { db } from './db';

// Import all routes
import authRoutes from './routes/auth';
import consumerRoutes from './routes/consumer';
import merchantRoutes from './routes/merchant';
import driverRoutes from './routes/driver';
import walletRoutes from './routes/wallet';
import paymentsRoutes from './routes/payments';
import { registerFuelOrderRoutes } from './routes/fuel-orders';
import ordersRoutes from './routes/orders';
import analyticsRoutes from './routes/analytics';
import dashboardRoutes from './routes/dashboard';
import categoriesRoutes from './routes/categories';
import healthCheckRoutes from './routes/health-check';
import adminRoutes from './admin/routes';
import missingApisRoutes from './routes/missing-apis';
import adminReportsRoutes from './routes/admin-reports';
import adminSettingsRoutes from './routes/admin-settings';
import adminAnalyticsRoutes from './routes/admin-analytics';
import driverEarningsRoutes from './routes/driver-earnings';
import merchantInventoryRoutes from './routes/merchant-inventory';
import adminSystemMetricsRoutes from './routes/admin-system-metrics';
import driverPerformanceRoutes from './routes/driver-performance';
import productsRoutes from './routes/products';
import ratingsReviewsRoutes from './routes/ratings-reviews';
import verificationRoutes from './routes/verification';
import supportRoutes from './routes/support';
import liveChatRoutes from './routes/live-chat';
import qrReceiptsRoutes from './routes/qr-receipts';
import qrProcessingRoutes from './routes/qr-processing';
import tollPaymentsRoutes from './routes/toll-payments';
import systemHealthRoutes from './routes/system-health';
import mfaAuthenticationRoutes from './routes/mfa-authentication';
import enhancedVerificationRoutes from './routes/enhanced-verification';
import socialAuthRoutes from './routes/social-auth';
import legalComplianceRoutes from './routes/legal-compliance';
import nigerianComplianceRoutes from './routes/nigerian-compliance';
import escrowManagementRoutes from './routes/escrow-management';
import realTimeTrackingRoutes from './routes/real-time-tracking';
import driverLocationRoutes from './routes/driver-location';
import locationRecommendationsRoutes from './routes/location-recommendations';
import withdrawalSystemRoutes from './routes/withdrawal-system';
import orderStatusRoutes from './routes/order-status';
import activeOrdersRoutes from './routes/active-orders';
import vendorFeedRoutes from './routes/vendor-feed';
import merchantKycRoutes from './routes/merchant-kyc';
import driverTierRoutes from './routes/driver-tier';
import roleManagementRoutes from './routes/role-management';
import adminUserManagementRoutes from './routes/admin-user-management';
import adminOversightRoutes from './routes/admin-oversight';
import adminSupportRoutes from './routes/admin-support';
import adminMerchantKycRoutes from './routes/admin-merchant-kyc';
import driverMerchantCoordinationRoutes from './routes/driver-merchant-coordination';
import errorLoggingRoutes from './routes/error-logging';
import analyticsLoggingRoutes from './routes/analytics-logging';
import liveSystemRoutes from './routes/live-system';
import systemStatusRoutes from './routes/system-status';
import dataPrivacyRoutes from './routes/data-privacy';
import secureTransactionsRoutes from './routes/secure-transactions';
import paystackWebhooksRoutes from './routes/paystack-webhooks';
import qrPaymentsRoutes from './routes/qr-payments';
import simpleVerificationRoutes from './routes/simple-verification';
import testRealtimeRoutes from './routes/test-realtime';
import websocketTestRoutes from './routes/websocket-test';
import mobileDatabaseRoutes from './routes/mobile-database';
import mobileHealthRoutes from './routes/mobile-health';
import fileSyncRoutes from './routes/file-sync';
import debugRoutes from './routes/debug';

// Import middleware
import { authenticateUser } from './middleware/auth';

const app: Express = express();
const server = createServer(app);
const port = process.env.PORT || 5000;

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://*.replit.app", "https://*.replit.co"] 
      : ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io available globally
declare global {
  var io: Server;
}
global.io = io;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://*.replit.app", "https://*.replit.co"] 
    : ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
app.use(authenticateUser);

// Health check route (must be first)
app.use('/api/health', healthCheckRoutes);

// Core API routes
app.use('/api/auth', authRoutes);
app.use('/api/consumer', consumerRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/admin', adminRoutes);

// Additional API routes
app.use('/api/missing', missingApisRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/ratings', ratingsReviewsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/chat', liveChatRoutes);
app.use('/api/qr-receipts', qrReceiptsRoutes);
app.use('/api/qr-processing', qrProcessingRoutes);
app.use('/api/toll-payments', tollPaymentsRoutes);
app.use('/api/system-health', systemHealthRoutes);
app.use('/api/mfa', mfaAuthenticationRoutes);
app.use('/api/enhanced-verification', enhancedVerificationRoutes);
app.use('/api/social-auth', socialAuthRoutes);
app.use('/api/legal-compliance', legalComplianceRoutes);
app.use('/api/nigerian-compliance', nigerianComplianceRoutes);
app.use('/api/escrow', escrowManagementRoutes);
app.use('/api/real-time-tracking', realTimeTrackingRoutes);
app.use('/api/driver-location', driverLocationRoutes);
app.use('/api/location-recommendations', locationRecommendationsRoutes);
app.use('/api/withdrawal', withdrawalSystemRoutes);
app.use('/api/order-status', orderStatusRoutes);
app.use('/api/active-orders', activeOrdersRoutes);
app.use('/api/vendor-feed', vendorFeedRoutes);
app.use('/api/merchant-kyc', merchantKycRoutes);
app.use('/api/driver-tier', driverTierRoutes);
app.use('/api/role-management', roleManagementRoutes);

// Admin routes
app.use('/api/admin/reports', adminReportsRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/system-metrics', adminSystemMetricsRoutes);
app.use('/api/admin/user-management', adminUserManagementRoutes);
app.use('/api/admin/oversight', adminOversightRoutes);
app.use('/api/admin/support', adminSupportRoutes);
app.use('/api/admin/merchant-kyc', adminMerchantKycRoutes);

// Driver specific routes
app.use('/api/driver/earnings', driverEarningsRoutes);
app.use('/api/driver/performance', driverPerformanceRoutes);
app.use('/api/driver/coordination', driverMerchantCoordinationRoutes);

// Merchant specific routes
app.use('/api/merchant/inventory', merchantInventoryRoutes);

// System and monitoring routes
app.use('/api/error-logging', errorLoggingRoutes);
app.use('/api/analytics-logging', analyticsLoggingRoutes);
app.use('/api/live-system', liveSystemRoutes);
app.use('/api/system-status', systemStatusRoutes);
app.use('/api/data-privacy', dataPrivacyRoutes);

// Payment and transaction routes
app.use('/api/secure-transactions', secureTransactionsRoutes);
app.use('/api/paystack-webhooks', paystackWebhooksRoutes);
app.use('/api/qr-payments', qrPaymentsRoutes);

// Verification routes
app.use('/api/simple-verification', simpleVerificationRoutes);

// Testing and development routes
app.use('/api/test-realtime', testRealtimeRoutes);
app.use('/api/websocket-test', websocketTestRoutes);

// Mobile specific routes
app.use('/api/mobile/database', mobileDatabaseRoutes);
app.use('/api/mobile/health', mobileHealthRoutes);
app.use('/api/mobile/sync', fileSyncRoutes);

// Debug routes (development only)
if (process.env.NODE_ENV === 'development') {
  app.use('/api/debug', debugRoutes);
}

// Register fuel order routes
registerFuelOrderRoutes(app);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user authentication for socket
  socket.on('authenticate', (data) => {
    if (data.userId) {
      socket.join(`user_${data.userId}`);
      
      // Join role-specific rooms
      if (data.role === 'DRIVER') {
        socket.join('drivers');
      } else if (data.role === 'MERCHANT') {
        socket.join('merchants');
      } else if (data.role === 'ADMIN') {
        socket.join('admin_monitoring');
      }
      
      console.log(`User ${data.userId} authenticated with role ${data.role}`);
    }
  });

  // Handle driver location updates
  socket.on('driver_location_update', (data) => {
    // Broadcast to relevant parties (customers, merchants, admin)
    if (data.orderId) {
      socket.to(`order_${data.orderId}`).emit('driver_location', data);
    }
    socket.to('admin_monitoring').emit('driver_location_update', data);
  });

  // Handle order updates
  socket.on('order_update', (data) => {
    socket.to(`order_${data.orderId}`).emit('order_status_update', data);
    socket.to('admin_monitoring').emit('order_update', data);
  });

  // Handle payment updates
  socket.on('payment_update', (data) => {
    socket.to(`user_${data.userId}`).emit('payment_status_update', data);
  });

  // Handle chat messages
  socket.on('send_message', (data) => {
    socket.to(`user_${data.recipientId}`).emit('new_message', data);
  });

  // Handle order tracking
  socket.on('track_order', (data) => {
    socket.join(`order_${data.orderId}`);
  });

  // Handle real-time notifications
  socket.on('notification_sent', (data) => {
    socket.to(`user_${data.userId}`).emit('new_notification', data);
  });

  // Handle driver availability updates
  socket.on('driver_availability_update', (data) => {
    socket.to('merchants').emit('driver_availability', data);
    socket.to('admin_monitoring').emit('driver_availability_update', data);
  });

  // Handle merchant status updates
  socket.on('merchant_status_update', (data) => {
    socket.to('drivers').emit('merchant_status', data);
    socket.to('admin_monitoring').emit('merchant_status_update', data);
  });

  // Handle system alerts
  socket.on('system_alert', (data) => {
    socket.to('admin_monitoring').emit('system_alert', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // Handle React routing
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Database connection test
(async () => {
  try {
    await db.execute("SELECT 1");
    console.log('📊 Database: Connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
})();

server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
  console.log(`🔐 Session Secret: ${process.env.SESSION_SECRET ? 'Set' : 'Using fallback'}`);
  console.log(`📡 WebSocket: Enabled`);
  console.log(`🛡️  Security: Enabled (Helmet, Rate Limiting, CORS)`);
  console.log(`📝 Logging: ${process.env.NODE_ENV !== 'test' ? 'Enabled' : 'Disabled'}`);
  console.log('✅ All API routes registered and functional');
});

export { app, io };
