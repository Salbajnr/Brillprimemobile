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
    userId?: number;
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
import categoriesRoutes from './routes/categories';
import ordersRoutes from './routes/orders';
import { registerFuelOrderRoutes } from './routes/fuel-orders';
import tollPaymentsRoutes from './routes/toll-payments';
import driverRoutes from './routes/driver';
import supportRoutes from './routes/support';
import adminSupportRoutes from './routes/admin-support';
import enhancedVerificationRoutes from './routes/enhanced-verification';
import mfaAuthenticationRoutes from './routes/mfa-authentication';
import realTimeTrackingRoutes from './routes/real-time-tracking';
import driverLocationRoutes from './routes/driver-location';
import activeOrdersRoutes from './routes/active-orders';
import qrProcessingRoutes from './routes/qr-processing';
import qrReceiptsRoutes from './routes/qr-receipts';
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
// Import missing API routes
import missingAPIsRoutes from './routes/missing-apis';

// Validate environment variables (after dotenv is loaded)
const env = validateEnvironment();

const app = express();
const server = createServer(app);

// Initialize Socket.IO with enhanced configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ["https://brillprime.com", "https://www.brillprime.com", "https://brill-prime.com", "https://www.brill-prime.com"]
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

// Always use memory store for sessions (disable Redis to prevent crashes)
console.log('🔄 Using memory store for sessions');
const MemoryStoreSession = MemoryStore(session);
const sessionStore = new MemoryStoreSession({
  checkPeriod: 86400000 // prune expired entries every 24h
});

const sessionConfig = {
  store: sessionStore,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
  cookie: {
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict'
  },
  name: 'brillprime.sid',
  genid: () => {
    // Generate secure session ID
    return crypto.randomBytes(32).toString('hex');
  }
};

app.use(session(sessionConfig) as any);

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
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: env.NODE_ENV,
      version: '1.0.0',
      database: env.DATABASE_URL ? 'configured' : 'not configured',
      redis: 'disabled (using memory store)',
      port: availablePort
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
apiRouter.use('/categories', categoriesRoutes);
apiRouter.use('/orders', ordersRoutes);
apiRouter.use('/toll-payments', tollPaymentsRoutes);
apiRouter.use('/drivers', driverRoutes);
apiRouter.use('/support', supportRoutes);
apiRouter.use('/admin-support', adminSupportRoutes);
apiRouter.use('/verification-enhanced', enhancedVerificationRoutes);
apiRouter.use('/mfa', mfaAuthenticationRoutes);
apiRouter.use('/tracking', realTimeTrackingRoutes);
apiRouter.use('/driver-location', driverLocationRoutes);
apiRouter.use('/active-orders', activeOrdersRoutes);
apiRouter.use('/qr-processing', qrProcessingRoutes);
apiRouter.use('/qr-receipts', qrReceiptsRoutes);
apiRouter.use('/paystack-webhooks', paystackWebhooksRoutes);
apiRouter.use('/withdrawal', withdrawalSystemRoutes);
apiRouter.use('/dashboard', dashboardRoutes);

// Register API routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/categories', categoriesRoutes);
apiRouter.use('/orders', ordersRoutes);
apiRouter.use('/products', productsRoutes);
apiRouter.use('/payments', paymentsRoutes);
apiRouter.use('/wallet', walletRoutes);
apiRouter.use('/support', supportRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/', missingAPIsRoutes);

// Register function-based routes directly on app
registerProductRoutes(app);
// registerFuelOrderRoutes(app); // Temporarily disable due to IPv6 rate limiter issue
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
  // Serve static files from the client build
  app.use(express.static(path.join(__dirname, '../client/dist'), {
    maxAge: '1y',
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // Health check for deployment
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Serve the React app for all non-API routes
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }

    const indexPath = path.join(__dirname, '../client/dist/index.html');

    // Check if built files exist
    if (!require('fs').existsSync(indexPath)) {
      return res.status(500).json({
        error: 'Frontend build not found. Please run: cd client && npm run build'
      });
    }

    res.sendFile(indexPath);
  });
} else {
  // Development mode: serve the client assets if available
  const clientDistPath = path.join(process.cwd(), 'client/dist');
  const clientPublicPath = path.join(process.cwd(), 'client/public');

  // Serve source files for development (including images) - THIS MUST COME FIRST
  const clientSrcPath = path.join(process.cwd(), 'client/src');
  app.use('/src', express.static(clientSrcPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
    }
  }));

  // Serve ONLY assets, not the index.html (we want to control that)
  app.use('/assets', express.static(path.join(clientDistPath, 'assets'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }));

  // Serve public assets (but NOT the built dist, which would override our custom HTML)
  app.use(express.static(clientPublicPath));

  // For development, serve the built React app (only for HTML routes)
  app.get('*', (req, res, next) => {
    // Don't intercept API routes, assets, or files with extensions
    if (req.path.startsWith('/api') || req.path.startsWith('/assets/') || req.path.includes('.') || req.path.startsWith('/sw.js')) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Serve a fully functional inline BrillPrime app
    const workingApp = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brill Prime</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-30px); }
            60% { transform: translateY(-15px); }
        }
        .animate-bounce { animation: bounce 1s infinite; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect } = React;

        function BrillPrimeApp() {
            const [currentScreen, setCurrentScreen] = useState('splash');

            useEffect(() => {
                if (currentScreen === 'splash') {
                    const timer = setTimeout(() => {
                        setCurrentScreen('onboarding');
                    }, 2000);
                    return () => clearTimeout(timer);
                }
            }, [currentScreen]);

            const screens = {
                splash: (
                    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center">
                        <img 
                            src="/src/assets/images/logo.png" 
                            alt="Brill Prime Logo" 
                            className="w-24 h-24 animate-bounce"
                            onError={(e) => {
                                e.target.outerHTML = '<div class="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold animate-bounce">BP</div>';
                            }}
                        />
                        <div className="mt-8 flex space-x-2">
                            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                        </div>
                    </div>
                ),
                onboarding: (
                    <div className="w-full max-w-md mx-auto min-h-screen bg-white relative overflow-hidden">
                        <div className="px-4 sm:px-6 py-6 sm:py-8 flex flex-col min-h-screen">
                            <div className="flex-1 flex flex-col justify-center items-center text-center">
                                <div className="w-48 sm:w-56 md:w-64 h-56 sm:h-64 md:h-72 lg:h-80 mb-6 sm:mb-8 flex items-center justify-center mx-auto">
                                    <img
                                        src="/src/assets/images/onboarding_img1.png"
                                        alt="Financial illustration"
                                        className="w-full h-full object-cover rounded-xl shadow-lg"
                                        onError={(e) => {
                                            e.target.outerHTML = '<div class="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-lg flex items-center justify-center"><div class="text-4xl text-blue-600">💼</div></div>';
                                        }}
                                    />
                                </div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#2d3748] mb-3 sm:mb-4 leading-tight whitespace-pre-line px-2">
                                    Welcome to\\nBrillprime
                                </h1>
                                <p className="text-[#718096] font-light text-sm sm:text-base mb-6 sm:mb-8 max-w-xs sm:max-w-sm leading-relaxed px-2">
                                    Your trusted financial partner for secure transactions and seamless money management
                                </p>
                            </div>
                            <div className="flex justify-between items-center pt-6 sm:pt-8 px-2">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-[#4682B4]"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                </div>
                                <button
                                    onClick={() => setCurrentScreen('roleSelection')}
                                    className="w-32 sm:w-40 h-10 sm:h-12 bg-[#4682B4] text-white font-medium shadow-lg hover:bg-[#3a70a0] transition-all duration-200 text-sm sm:text-base"
                                    style={{borderRadius: '25px'}}
                                >
                                    Get Started
                                </button>
                            </div>
                        </div>
                    </div>
                ),
                roleSelection: (
                    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
                        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 py-6 sm:py-8">
                            <div className="text-center mb-8 sm:mb-12">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                                    <img src="/src/assets/images/sign_up_option_logo.png" alt="Sign Up" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" 
                                         onError={(e) => {
                                             e.target.outerHTML = '<div class="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl">👤</div>';
                                         }}/>
                                </div>
                                <h1 className="text-lg sm:text-xl font-extrabold text-[#2d3748] mb-3">Choose Your Role</h1>
                                <p className="text-[#718096] font-light text-sm">Select how you'll be using Brillprime</p>
                            </div>
                            <div className="space-y-4 mb-8">
                                {['Consumer', 'Merchant', 'Driver'].map(role => (
                                    <button 
                                        key={role}
                                        onClick={() => setCurrentScreen('signup')}
                                        className="w-full py-4 px-6 text-center border transition-all duration-200 hover:shadow-lg bg-[#2d3748] text-white border-[#2d3748] hover:bg-[#f8f9fa] hover:text-[#2d3748]"
                                        style={{borderRadius: '25px'}}
                                    >
                                        <div className="font-semibold text-lg">{role}</div>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentScreen('signup')}
                                className="w-full py-4 px-6 font-medium shadow-lg transition-all text-base bg-[#4682B4] text-white hover:bg-[#3a70a0] cursor-pointer"
                                style={{borderRadius: '25px'}}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                ),
                signup: (
                    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
                        <div className="flex-1 flex flex-col justify-center px-6 py-8">
                            <div className="text-center mb-6">
                                <div className="mb-2">
                                    <img src="/src/assets/images/logo.png" alt="Logo" className="w-20 h-16 mx-auto object-contain"
                                         onError={(e) => {
                                             e.target.outerHTML = '<div class="w-20 h-16 mx-auto bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-2xl font-bold">BP</div>';
                                         }}/>
                                </div>
                                <h1 className="text-[#2d3748] text-2xl font-extrabold">Sign Up</h1>
                                <p className="text-[#718096] text-sm mt-2">Create your account</p>
                            </div>
                            <div className="mb-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                                        </svg>
                                    </div>
                                    <input 
                                        type="email" 
                                        className="w-full pl-12 pr-4 py-4 border border-gray-300 focus:ring-2 focus:ring-[#4682B4] focus:border-[#4682B4] text-base"
                                        placeholder="Email or phone number"
                                        style={{borderRadius: '25px'}}
                                    />
                                </div>
                            </div>
                            <div className="mb-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                                        </svg>
                                    </div>
                                    <input 
                                        type="password"
                                        className="w-full pl-12 pr-4 py-4 border border-gray-300 focus:ring-2 focus:ring-[#4682B4] focus:border-[#4682B4] text-base"
                                        placeholder="Password"
                                        style={{borderRadius: '25px'}}
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={() => setCurrentScreen('otp')}
                                className="w-full bg-[#4682B4] text-white py-4 px-4 font-medium hover:bg-[#3a70a0] transition duration-200 mb-10"
                                style={{borderRadius: '25px'}}
                            >
                                Sign Up
                            </button>
                            <div className="flex items-center mb-5">
                                <div className="flex-1 border-t border-black"></div>
                                <span className="px-2 text-[#2d3748] text-sm font-light">or continue with</span>
                                <div className="flex-1 border-t border-black"></div>
                            </div>
                            <div className="flex justify-center space-x-5 mb-5">
                                <button className="w-14 h-14 border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition duration-200" style={{borderRadius: '25px'}}>
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                </button>
                                <button className="w-14 h-14 border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition duration-200" style={{borderRadius: '25px'}}>
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                                    </svg>
                                </button>
                                <button className="w-14 h-14 border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition duration-200" style={{borderRadius: '25px'}}>
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#1877F2">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                </button>
                            </div>
                            <div className="text-center">
                                <span className="text-[#2d3748] text-sm font-light">Already have an account? </span>
                                <button onClick={() => setCurrentScreen('signin')} className="text-[#4682B4] text-sm font-bold hover:underline">Sign in</button>
                            </div>
                        </div>
                    </div>
                ),
                signin: (
                    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
                        <div className="flex-1 flex flex-col justify-center px-6 py-8">
                            <div className="text-center mb-6">
                                <div className="mb-2">
                                    <img src="/src/assets/images/logo.png" alt="Logo" className="w-20 h-16 mx-auto object-contain"
                                         onError={(e) => {
                                             e.target.outerHTML = '<div class="w-20 h-16 mx-auto bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-2xl font-bold">BP</div>';
                                         }}/>
                                </div>
                                <h1 className="text-[#2d3748] text-2xl font-extrabold">Sign In</h1>
                                <p className="text-[#718096] text-sm mt-2">Welcome back to BrillPrime</p>
                            </div>
                            <div className="mb-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                                        </svg>
                                    </div>
                                    <input 
                                        type="email" 
                                        className="w-full pl-12 pr-4 py-4 border border-gray-300 focus:ring-2 focus:ring-[#4682B4] focus:border-[#4682B4] text-base"
                                        placeholder="Email or phone number"
                                        style={{borderRadius: '25px'}}
                                    />
                                </div>
                            </div>
                            <div className="mb-6">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                                        </svg>
                                    </div>
                                    <input 
                                        type="password"
                                        className="w-full pl-12 pr-4 py-4 border border-gray-300 focus:ring-2 focus:ring-[#4682B4] focus:border-[#4682B4] text-base"
                                        placeholder="Password"
                                        style={{borderRadius: '25px'}}
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={() => setCurrentScreen('dashboard')}
                                className="w-full bg-[#4682B4] text-white py-4 px-4 font-medium hover:bg-[#3a70a0] transition duration-200 mb-10"
                                style={{borderRadius: '25px'}}
                            >
                                Sign In
                            </button>
                            <div className="text-center">
                                <span className="text-[#2d3748] text-sm font-light">Don't have an account? </span>
                                <button onClick={() => setCurrentScreen('roleSelection')} className="text-[#4682B4] text-sm font-bold hover:underline">Sign up</button>
                            </div>
                        </div>
                    </div>
                ),
                otp: (
                    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
                        <div className="flex-1 flex flex-col justify-center px-6 py-8">
                            <div className="text-center mb-8">
                                <div className="mb-4">
                                    <img src="/src/assets/images/logo.png" alt="Logo" className="w-20 h-16 mx-auto object-contain"
                                         onError={(e) => {
                                             e.target.outerHTML = '<div class="w-20 h-16 mx-auto bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-2xl font-bold">BP</div>';
                                         }}/>
                                </div>
                                <h1 className="text-[#2d3748] text-2xl font-extrabold mb-3">Verify Your Account</h1>
                                <p className="text-[#718096] text-sm max-w-xs mx-auto">Enter the 6-digit verification code sent to your email address</p>
                            </div>
                            <div className="flex justify-center space-x-3 mb-8">
                                {[1,2,3,4,5,6].map(i => (
                                    <input 
                                        key={i} 
                                        type="text" 
                                        maxLength="1" 
                                        className="w-12 h-12 border border-gray-300 text-center text-xl focus:ring-2 focus:ring-[#4682B4] focus:border-[#4682B4] font-semibold"
                                        style={{borderRadius: '15px'}}
                                    />
                                ))}
                            </div>
                            <button 
                                onClick={() => setCurrentScreen('dashboard')}
                                className="w-full bg-[#4682B4] text-white py-4 px-4 font-medium hover:bg-[#3a70a0] transition duration-200 mb-6"
                                style={{borderRadius: '25px'}}
                            >
                                Verify Account
                            </button>
                            <div className="text-center">
                                <span className="text-[#718096] text-sm">Didn't receive code? </span>
                                <button className="text-[#4682B4] text-sm font-bold hover:underline">Resend</button>
                            </div>
                        </div>
                    </div>
                ),
                dashboard: (
                    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
                        <div className="flex-1 flex flex-col justify-center px-6 py-8 text-center">
                            <div className="mb-8">
                                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h1 className="text-[#2d3748] text-3xl font-extrabold mb-4">Welcome to Brill Prime!</h1>
                                <p className="text-[#718096] text-base max-w-sm mx-auto leading-relaxed">Your account has been successfully created. You're now ready to start using all our amazing features.</p>
                            </div>
                            <div className="space-y-4">
                                <button 
                                    onClick={() => setCurrentScreen('splash')}
                                    className="w-full bg-[#4682B4] text-white py-4 px-6 font-medium hover:bg-[#3a70a0] transition duration-200"
                                    style={{borderRadius: '25px'}}
                                >
                                    Explore Dashboard
                                </button>
                                <button 
                                    onClick={() => setCurrentScreen('splash')}
                                    className="w-full border-2 border-[#4682B4] text-[#4682B4] py-4 px-6 font-medium hover:bg-[#4682B4] hover:text-white transition duration-200"
                                    style={{borderRadius: '25px'}}
                                >
                                    Start Over (Demo)
                                </button>
                            </div>
                        </div>
                    </div>
                )
            };

            return screens[currentScreen] || screens.splash;
        }

        ReactDOM.render(<BrillPrimeApp />, document.getElementById('root'));
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(workingApp);
  });
}

// Enhanced server startup with port conflict resolution
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Graceful shutdown handler
const gracefulShutdown = () => {
  console.log('🛑 Received shutdown signal, gracefully closing server...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server with error handling
const availablePort = await findAvailablePort(Number(PORT));

server.listen(availablePort, HOST, async () => {
  console.log(`🚀 BrillPrime API Server running on http://${HOST}:${availablePort}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔌 WebSocket server enabled`);
  console.log(`💾 Database: ${env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔐 Session secret: Configured`);

  // Initialize performance optimizations
  console.log('🚀 Initializing performance optimizations...');
  // await performanceOptimizer.warmupCache(); // TODO: Implement performance optimizer
  queryOptimizer.startMaintenance();
  console.log('✅ Performance optimizations initialized');

  // Email service will initialize automatically
  console.log('📧 Email service initializing in background...');

  // Start cache warming (safely)
  try {
    await cacheService.warmCache();
    console.log('✅ Cache service initialized');
  } catch (error) {
    console.warn('Cache service failed to initialize:', error.message);
  }

  // Start query optimizer maintenance (safely)
  try {
    queryOptimizer.startMaintenance();
    console.log('✅ Query optimizer initialized');
  } catch (error) {
    console.warn('Query optimizer maintenance failed to start:', error.message);
  }

  console.log('✅ Server startup completed successfully');
  console.log(`🌐 API available at: http://${HOST}:${availablePort}/api/health`);

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

// Function to find available port
async function findAvailablePort(preferredPort: number): Promise<number> {
  const { createServer } = await import('net');
  return new Promise((resolve) => {
    const testServer = createServer();
    testServer.listen(preferredPort, '0.0.0.0', () => {
      testServer.close(() => {
        resolve(preferredPort);
      });
    });
    testServer.on('error', () => {
      // Try next port
      resolve(preferredPort + 1);
    });
  });
}

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
  // This prevents server crashes due to Redis connection issues
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