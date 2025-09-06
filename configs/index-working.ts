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

// Import working routes only
import healthCheckRoutes from './routes/health-check';
import authRoutes from './routes/auth';
import systemHealthRoutes from './routes/system-health';
import mfaAuthenticationRoutes from './routes/mfa-authentication';
import enhancedVerificationRoutes from './routes/enhanced-verification';
import databaseMonitoringRoutes from './routes/database-monitoring';
import autoAssignmentRoutes from './routes/auto-assignment';
import deliveryFeedbackRoutes from './routes/delivery-feedback';
import adminRoutes from './admin/routes';

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

// Health check route (must be first)
app.use('/api/health', healthCheckRoutes);

// Admin API routes (only accessible on admin subdomain)
app.use('/api/admin', (req, res, next) => {
  if (req.subdomain !== 'admin') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
}, adminRoutes);

// Core API routes - Start with working ones
app.use('/api/auth', authRoutes);
app.use('/api/system-health', systemHealthRoutes);
app.use('/api/mfa', mfaAuthenticationRoutes);
app.use('/api/enhanced-verification', enhancedVerificationRoutes);
app.use('/api/database', databaseMonitoringRoutes);
app.use('/api/auto-assignment', autoAssignmentRoutes);
app.use('/api/delivery-feedback', deliveryFeedbackRoutes);

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'BrillPrime API working!' });
});

// Serve static files based on environment
if (process.env.NODE_ENV === 'production') {
  // Serve built files in production
  app.use(express.static(path.join(__dirname, '../client/dist')));
  console.log('✅ Serving built client files from dist/');
} else {
  // In development, serve source files directly
  app.use(express.static(path.join(__dirname, '../client')));
  console.log('✅ Serving client source files for development');
}

// Admin SPA fallback
app.get('/admin/*', (req, res) => {
  const adminIndexPath = path.join(__dirname, '../admin/dist/index.html');
  console.log('Serving admin SPA fallback:', adminIndexPath);

  res.sendFile(adminIndexPath, (err) => {
    if (err) {
      console.error('Error serving admin index.html:', err);
      res.status(500).send('Error loading admin application');
    }
  });
});

// Client SPA fallback for non-admin routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  const clientIndexPath = path.join(__dirname, '../client/dist/index.html');
  console.log('Serving client SPA fallback:', clientIndexPath);

  res.sendFile(clientIndexPath, (err) => {
    if (err) {
      console.error('Error serving client index.html:', err);
      res.status(500).send('Error loading client application');
    }
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BrillPrime server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Server ready to serve requests!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});