import dotenv from 'dotenv';

// Load .env file but preserve system environment variables (Replit compatibility)
dotenv.config({ path: '.env', override: false });

import express, { Express, Request, Response } from "express";
import cors from "cors";
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Import environment validation
import '../configs/env-validation';

// Import cloud configuration enforcers - but make them optional for development
async function initializeCloudConfig() {
  try {
    const cloudConfigModule = await import('../configs/cloud-config-enforcer');
    const { enforceCloudConfiguration, validateProductionEnvironment } = cloudConfigModule;

    // Only enforce cloud configuration in production
    if (process.env.NODE_ENV === 'production') {
      enforceCloudConfiguration();

      if (!validateProductionEnvironment()) {
        console.error('❌ Production environment validation failed. Exiting...');
        process.exit(1);
      }
    }
  } catch (error) {
    console.log('⚠️  Cloud configuration modules not available, continuing with basic setup');
  }
}

// Ensure system environment variables take precedence for Replit compatibility
console.log('🔧 Using Replit PostgreSQL database');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extend Request interface to include subdomain
declare global {
  namespace Express {
    interface Request {
      subdomain?: string;
    }
  }
}

const app: Express = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [
          "https://www.brillprime.com",
          "https://brillprime.com",
          "https://brillprime-backend.replit.app",
          "https://*.replit.app",
          "https://*.replit.dev",
          process.env.FRONTEND_URL,
          process.env.CORS_ORIGIN
        ].filter((url): url is string => Boolean(url))
      : ["http://localhost:3000", "http://localhost:5173", "http://0.0.0.0:5000"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        "https://www.brillprime.com",
        "https://brillprime.com",
        "https://brillprime-backend.replit.app",
        "https://*.replit.app",
        "https://*.replit.dev",
        process.env.FRONTEND_URL,
        process.env.CORS_ORIGIN
      ].filter((url): url is string => Boolean(url))
    : ["http://localhost:3000", "http://localhost:5173", "http://0.0.0.0:5000"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Subdomain routing middleware
app.use((req, res, next) => {
  const host = req.get('host') || '';
  const subdomain = host.split('.')[0];

  // Store subdomain info for later use
  req.subdomain = subdomain;
  next();
});

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Session configuration
app.use('/', session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Dynamic route loading to avoid static import issues
async function loadRoutes() {
  console.log('📦 Loading all API routes dynamically...');
  
  try {
    // Core routes
    const { default: healthCheckRoutes } = await import('./routes/health-check');
    app.use('/api/health', healthCheckRoutes);
    console.log('✅ Health check routes loaded');

    const { default: authRoutes } = await import('./routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded');

    // Business core routes
    const { default: ordersRoutes } = await import('./routes/orders');
    app.use('/api/orders', ordersRoutes);
    console.log('✅ Orders routes loaded');

    const { default: paymentsRoutes } = await import('./routes/payments');
    app.use('/api/payments', paymentsRoutes);
    console.log('✅ Payments routes loaded');

    const { default: productsRoutes } = await import('./routes/products');
    app.use('/api/products', productsRoutes);
    console.log('✅ Products routes loaded');

    // User roles
    const { default: consumerRoutes } = await import('./routes/consumer');
    app.use('/api/consumer', consumerRoutes);
    console.log('✅ Consumer routes loaded');

    const { default: driverRoutes } = await import('./routes/driver');
    app.use('/api/driver', driverRoutes);
    console.log('✅ Driver routes loaded');

    const { default: merchantRoutes } = await import('./routes/merchant');
    app.use('/api/merchant', merchantRoutes);
    console.log('✅ Merchant routes loaded');

    // Feature routes
    const { default: walletRoutes } = await import('./routes/wallet');
    app.use('/api/wallet', walletRoutes);
    console.log('✅ Wallet routes loaded');

    const { default: trackingRoutes } = await import('./routes/real-time-tracking');
    app.use('/api/tracking', trackingRoutes);
    console.log('✅ Real-time tracking routes loaded');

    const { default: ratingsRoutes } = await import('./routes/ratings-reviews');
    app.use('/api/ratings', ratingsRoutes);
    console.log('✅ Ratings & reviews routes loaded');

    const { default: supportRoutes } = await import('./routes/support');
    app.use('/api/support', supportRoutes);
    console.log('✅ Support routes loaded');

    const { default: qrPaymentsRoutes } = await import('./routes/qr-payments');
    app.use('/api/qr', qrPaymentsRoutes);
    console.log('✅ QR payments routes loaded');

    const { default: escrowRoutes } = await import('./routes/escrow');
    app.use('/api/escrow', escrowRoutes);
    console.log('✅ Escrow routes loaded');

    // Advanced features
    const { default: analyticsRoutes } = await import('./routes/analytics');
    app.use('/api/analytics', analyticsRoutes);
    console.log('✅ Analytics routes loaded');

    const { default: verificationRoutes } = await import('./routes/verification');
    app.use('/api/verification', verificationRoutes);
    console.log('✅ Verification routes loaded');

    const { default: liveChatRoutes } = await import('./routes/live-chat');
    app.use('/api/chat', liveChatRoutes);
    console.log('✅ Live chat routes loaded');

    // System routes
    const { default: systemHealthRoutes } = await import('./routes/system-health');
    app.use('/api/system-health', systemHealthRoutes);
    console.log('✅ System health routes loaded');

    const { default: mfaRoutes } = await import('./routes/mfa-authentication');
    app.use('/api/mfa', mfaRoutes);
    console.log('✅ MFA routes loaded');

    // Admin routes
    const { default: adminRoutes } = await import('./admin/routes');
    app.use('/api/admin', adminRoutes);
    console.log('✅ Admin routes loaded');

    console.log('🎉 All API routes loaded successfully!');
  } catch (error) {
    console.error('❌ Error loading routes:', error);
  }
}

// Simple test route (available immediately)
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'BrillPrime API working!', 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API-only backend server - no frontend serving
console.log('✅ Running as API-only backend server');

// Handle non-API routes - return 404 for all non-API requests
app.use((req, res, next) => {
  // Handle API routes not found (after all API routes are checked)
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Return API info for all non-API requests
  res.status(404).json({ 
    error: 'This is a backend API server',
    message: 'Please use /api/ endpoints for all requests',
    availableEndpoints: [
      'POST /api/auth/register - User registration',
      'POST /api/auth/login - User login', 
      'POST /api/auth/oauth - OAuth login (Google/Apple/Facebook)',
      'POST /api/auth/verify-otp - OTP verification',
      'POST /api/auth/forgot-password - Password reset',
      'POST /api/auth/refresh - Token refresh',
      'GET /api/health - Health check',
      'GET /api/test - Test endpoint'
    ]
  });
});

// Start server and load routes
server.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 BrillPrime server starting on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Server ready to accept connections!`);
  
  // Initialize cloud configuration
  await initializeCloudConfig();
  
  // Load routes after server starts
  await loadRoutes();
  
  console.log(`✅ BrillPrime platform fully operational!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});