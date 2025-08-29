
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

// Import routes
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

// Health check route
app.use('/api/health', healthCheckRoutes);

// API routes
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

  // Handle chat messages
  socket.on('send_message', (data) => {
    socket.to(`user_${data.recipientId}`).emit('new_message', data);
  });

  // Handle order tracking
  socket.on('track_order', (data) => {
    socket.join(`order_${data.orderId}`);
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

server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});

export { app, io };
