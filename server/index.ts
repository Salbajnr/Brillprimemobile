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
import './env-validation';

// Import cloud configuration enforcers - but make them optional for development
try {
  const { preventLocalDatabaseCreation } = await import('./database-config-override');
  const { enforceCloudConfiguration, validateProductionEnvironment } = await import('./cloud-config-enforcer');

  // Only enforce cloud configuration in production
  if (process.env.NODE_ENV === 'production') {
    enforceCloudConfiguration();
    preventLocalDatabaseCreation();

    if (!validateProductionEnvironment()) {
      console.error('❌ Production environment validation failed. Exiting...');
      process.exit(1);
    }
  }
} catch (error) {
  console.log('⚠️  Cloud configuration modules not available, continuing with basic setup');
}

// Ensure system environment variables take precedence for Replit compatibility
console.log('🔧 Using Render PostgreSQL database configuration');

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
  console.log('📦 Loading API routes dynamically...');
  
  try {
    // Load and register essential routes using dynamic imports
    const { default: healthCheckRoutes } = await import('./routes/health-check');
    app.use('/api/health', healthCheckRoutes);
    console.log('✅ Health check routes loaded');

    const { default: authRoutes } = await import('./routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded');

    const { default: systemHealthRoutes } = await import('./routes/system-health');
    app.use('/api/system-health', systemHealthRoutes);
    console.log('✅ System health routes loaded');

    const { default: mfaAuthenticationRoutes } = await import('./routes/mfa-authentication');
    app.use('/api/mfa', mfaAuthenticationRoutes);
    console.log('✅ MFA routes loaded');

    const { default: databaseMonitoringRoutes } = await import('./routes/database-monitoring');
    app.use('/api/database', databaseMonitoringRoutes);
    console.log('✅ Database monitoring routes loaded');

    const { default: autoAssignmentRoutes } = await import('./routes/auto-assignment');
    app.use('/api/auto-assignment', autoAssignmentRoutes);
    console.log('✅ Auto assignment routes loaded');

    const { default: deliveryFeedbackRoutes } = await import('./routes/delivery-feedback');
    app.use('/api/delivery-feedback', deliveryFeedbackRoutes);
    console.log('✅ Delivery feedback routes loaded');

    // Load admin routes with subdomain protection
    const { default: adminRoutes } = await import('./admin/routes');
    app.use('/api/admin', (req, res, next) => {
      if (req.subdomain !== 'admin') {
        return res.status(404).json({ error: 'Not found' });
      }
      next();
    }, adminRoutes);
    console.log('✅ Admin routes loaded');

    console.log('🎉 All essential routes loaded successfully!');
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