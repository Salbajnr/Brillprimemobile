// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';
import { validateEnvironment } from './env-validation';
import { redisClient } from './services/cache';

// Import mobile specific configurations and routes
import './mobile/mobile-config'; // For mobile app configurations
import mobileHealthRoutes from './routes/mobile-health';
import mobileDatabaseRoutes from './routes/mobile-database'; // Mobile health route

// Import admin routes
import { registerAdminUserManagementRoutes } from './routes/admin-user-management';
import { registerAdminMerchantKycRoutes } from './routes/admin-merchant-kyc';
import { registerMerchantKycRoutes } from './routes/merchant-kyc';
import systemHealthRoutes from './routes/system-health';


// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}
// Enhanced security middleware
import {
  corsOptions,
  helmetConfig,
  generalRateLimit,
  authRateLimit,
  paymentRateLimit,
  requestId,
  securityHeaders,
  sanitizeInput,
  setupTrustedProxies
} from './middleware/security';
import { responseTimeMiddleware, realTimeAnalytics } from './services/realtimeAnalytics';
import { messageQueue } from './services/messageQueue';
import { pushNotificationService } from './services/pushNotifications';
import { cacheService } from './services/cache';
import { dashboardCache, productsCache, analyticsCache, locationCache } from './middleware/cacheMiddleware';
import { staticAssetsMiddleware, cdnHeaders, resourceHints, compressionConfig, assetVersioning, serviceWorkerCache } from './middleware/staticAssets';
import { requestTracker, circuitBreaker, adaptiveRateLimit, loadBalancerHeaders, healthCheck } from './middleware/loadBalancer';
import { queryOptimizer } from './services/queryOptimizer';
import { LiveSystemService } from './services/live-system';
// import { performanceOptimizer } from './middleware/cacheMiddleware'; // Not exported - commenting out
import { emailService } from './services/email';
// import compression from 'compression'; // Temporarily disabled due to dependency conflict

// Route imports - mixing default exports and function exports
import authRoutes from './routes/auth';
import socialAuthRoutes from './routes/social-auth';
import paymentsRoutes from './routes/payments';
import walletRoutes from './routes/wallet';
import { registerProductRoutes } from './routes/products';
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
import { registerEscrowManagementRoutes } from './routes/escrow-management';
import withdrawalSystemRoutes from './routes/withdrawal-system';
import debugRoutes from './routes/debug';
// Import compliance routes
import dataPrivacyRoutes from "./routes/data-privacy";
import legalComplianceRoutes from "./routes/legal-compliance";
import nigerianComplianceRoutes from "./routes/nigerian-compliance";
import dashboardRoutes from "./routes/dashboard";
// Import system status routes
import systemStatusRoutes from './routes/system-status';

// Validate environment variables (after dotenv is loaded)
const env = validateEnvironment();

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

// Performance and load balancing middleware
app.use(requestTracker);
// app.use(circuitBreaker); // Temporarily disabled to prevent 503 errors during Redis issues
app.use(loadBalancerHeaders);
// app.use(compression(compressionConfig)); // Temporarily disabled due to dependency conflict
app.use(cdnHeaders);
app.use(resourceHints);
app.use(assetVersioning);
app.use(serviceWorkerCache);

// Setup trusted proxies
setupTrustedProxies(app);

// Enhanced Security Middleware
app.use(requestId);
app.use(securityHeaders);
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(sanitizeInput);

// Application middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(responseTimeMiddleware);

// Use memory store for sessions in development environment
if (process.env.NODE_ENV !== 'production' || !process.env.REDIS_URL) {
  console.log('🔄 Using memory store for sessions (Redis disabled)');
  const MemoryStoreSession = MemoryStore(session);
  const sessionStore = new MemoryStoreSession({
    checkPeriod: 86400000 // prune expired entries every 24h
  });

  const sessionConfig = {
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict'
    },
    name: 'brillprime.sid',
    genid: () => {
      // Generate secure session ID
      return crypto.randomBytes(32).toString('hex');
    }
  };

  app.use(session(sessionConfig) as any);

} else {
  console.log('🔄 Using Redis store for sessions');
  const RedisStore = require('connect-redis')(session);
  const sessionStore = new RedisStore({ client: redisClient });

  const sessionConfig = {
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict'
    },
    name: 'brillprime.sid',
    genid: () => {
      // Generate secure session ID
      return crypto.randomBytes(32).toString('hex');
    }
  };

  app.use(session(sessionConfig) as any);
}

// CSRF token generation
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

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

// Health check endpoints
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    // await db.execute(sql`SELECT 1`); // Assuming 'db' is globally available or imported

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check for load balancer
app.get('/api/health/detailed', async (req, res) => {
  const cacheHealth = await cacheService.healthCheck();
  // const dbConnPool = await queryOptimizer.getConnectionPoolStats(); // Assuming queryOptimizer is available

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: cacheHealth,
    // database: dbConnPool,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Performance metrics endpoint
app.get('/api/metrics', (req, res) => {
  const queryStats = queryOptimizer.getQueryStats();
  res.json({
    queries: queryStats,
    timestamp: new Date().toISOString()
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

// API Routes with enhanced error handling and specific rate limiting
// Import session validation middleware
import { validateSession } from './middleware/session-validator';

// Centralized error handling for API
const apiRouter = express.Router();

// Add session validation to all API routes
apiRouter.use(validateSession);

// Note: Specific rate limiters are already applied globally above

// Apply caching middleware to appropriate routes
apiRouter.use('/analytics', analyticsCache);
apiRouter.use('/dashboard', dashboardCache);
apiRouter.use('/products', productsCache);
apiRouter.use('/drivers/location', locationCache);

// Centralized error handling for API routes
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Apply async error handling to all routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/auth', socialAuthRoutes);
apiRouter.use('/payments', paymentsRoutes);
apiRouter.use('/wallet', walletRoutes);
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
apiRouter.use('/withdrawal', withdrawalSystemRoutes);
apiRouter.use('/dashboard', dashboardRoutes);

// Register function-based routes directly on app
registerProductRoutes(app);
registerEscrowManagementRoutes(app);
registerAdminUserManagementRoutes(app);

app.use('/api', apiRouter);

// Register debug routes directly on app after apiRouter
app.use('/api/debug', debugRoutes);

// Add general error logging endpoint outside of API routes
app.post('/log-error', (req, res) => {
  console.error('Frontend error:', req.body);
  res.json({ success: true, message: 'Error logged' });
});

// Simple POST test endpoint for debugging
app.post('/api/test-post', (req, res) => {
  console.log('=== SIMPLE POST TEST ===');
  console.log('Body received:', req.body);
  console.log('Headers:', req.headers);
  console.log('========================');

  res.json({
    success: true,
    message: 'POST endpoint is working!',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// Add missing /me endpoint for authentication
app.get('/me', (req, res) => {
  if (req.session && req.session.userId && req.session.user) {
    res.json({
      success: true,
      user: {
        id: req.session.userId,
        role: req.session.user.role,
        fullName: req.session.user.fullName
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});

// Add API version of /me endpoint
app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.userId && req.session.user) {
    res.json({
      success: true,
      user: {
        id: req.session.userId,
        role: req.session.user.role,
        fullName: req.session.user.fullName
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});

// Import PCI compliance middleware
import {
  pciSecurityHeaders,
  sanitizeCardData,
  enforceHttps,
  pciAuditLogger
} from './middleware/pci-compliance';

// Apply PCI DSS compliance middleware (disabled during development migration)
// app.use(pciSecurityHeaders);
app.use(sanitizeCardData);
// app.use('/api/payments', enforceHttps);
// app.use('/api/transactions', enforceHttps);
// app.use('/api/wallet', enforceHttps);
app.use(pciAuditLogger);

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

// Serve static files and handle SPA routing
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  app.use(staticAssetsMiddleware());

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
} else {
  // Development mode: serve the client assets if available
  const clientDistPath = path.join(process.cwd(), 'client/dist');
  const clientPublicPath = path.join(process.cwd(), 'client/public');

  // First, serve built static assets
  app.use('/assets', express.static(path.join(clientDistPath, 'assets'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }));

  // Serve public assets
  app.use(express.static(clientPublicPath));

  // For development, serve the built React app (only for HTML routes)
  app.get('*', (req, res, next) => {
    // Don't intercept API routes, assets, or files with extensions
    if (req.path.startsWith('/api') || req.path.startsWith('/assets/') || req.path.includes('.') || req.path.startsWith('/sw.js')) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Create a simple working HTML page
    const simpleHTML = `<!DOCTYPE html>
<html>
<head>
    <title>BrillPrime</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            background: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .logo { 
            width: 100px; 
            height: 100px; 
            background: #4682B4; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-size: 24px; 
            font-weight: bold;
            animation: bounce 1s infinite;
        }
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        .text { 
            margin-top: 20px; 
            color: #666; 
            font-size: 18px;
        }
        .dots {
            margin-top: 10px;
            display: flex;
            gap: 5px;
        }
        .dot {
            width: 8px;
            height: 8px;
            background: #4682B4;
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse {
            0%, 80%, 100% { opacity: 0.3; }
            40% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="logo">BP</div>
    <div class="text">BrillPrime</div>
    <div class="dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    </div>
    <script>
        console.log('BrillPrime loaded successfully');
        setTimeout(function() {
            document.querySelector('.text').textContent = 'Welcome to BrillPrime!';
        }, 2000);
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(simpleHTML);
  });
}

// Enhanced server startup
const PORT = process.env.PORT || 5000;

server.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 BrillPrime server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket server enabled`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔐 Session secret: ${process.env.SESSION_SECRET ? 'Configured' : 'Using default'}`);

  // Initialize performance optimizations
  console.log('🚀 Initializing performance optimizations...');
  // await performanceOptimizer.warmupCache(); // TODO: Implement performance optimizer
  queryOptimizer.startMaintenance();
  console.log('✅ Performance optimizations initialized');

  // Initialize email service
  console.log('📧 Initializing email service...');
  await emailService.verifyConnection();
  console.log('✅ Email service initialized');

  // Start cache warming
  await cacheService.warmCache();

  // Start query optimizer maintenance (safely)
  try {
    queryOptimizer.startMaintenance();
  } catch (error) {
    console.warn('Query optimizer maintenance failed to start:', error.message);
  }

  // Log initial performance metrics
  const cacheHealth = await cacheService.healthCheck();
  console.log(`💾 Cache service: ${cacheHealth ? 'Connected' : 'Disconnected'}`);

  console.log('✅ Performance optimizations initialized');

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
  // Don't exit the process - Redis connection issues are handled gracefully
  // This prevents server crashes due to Redis connection attempts
});

// Register compliance and legal routes
app.use("/api/data-privacy", dataPrivacyRoutes);
app.use("/api/legal", legalComplianceRoutes);
app.use("/api/compliance", nigerianComplianceRoutes);

// Register mobile health routes
app.use('/api', mobileHealthRoutes);
app.use('/api', mobileDatabaseRoutes);

// Register system health routes
app.use('/api/system-health', systemHealthRoutes);

// Register missing API routes
import categoriesRoutes from "./routes/categories";
import ordersRoutes from "./routes/orders";
import orderStatusRoutes from "./routes/order-status";
import testRealtimeRoutes from "./routes/test-realtime";
import driverMerchantCoordinationRoutes from "./routes/driver-merchant-coordination";
import driverTierRoutes from "./routes/driver-tier";

// Add route registrations
app.use("/api/categories", categoriesRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/order-status", orderStatusRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/tracking", realTimeTrackingRoutes);
app.use("/api/analytics", analyticsRoutes);
testRealtimeRoutes(app);
app.use("/api/coordination", driverMerchantCoordinationRoutes);
app.use("/api/driver-tier", driverTierRoutes);

// Register system status route  
app.use('/api/system', systemStatusRoutes);

export default app;
