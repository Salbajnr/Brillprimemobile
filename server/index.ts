import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import { setupWebSocketServer } from "./websocket";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { db } from "./db";
import adminRoutes from "./admin/routes";
import { emailService } from "./services/email";
import { apiLimiter, authLimiter, paymentLimiter } from "./middleware/rateLimiter";
import helmet from "helmet";
import compression from "compression";
import errorLoggingRoutes from "./routes/error-logging";
import { securityHeaders, corsHeaders, requestValidation } from "./middleware/securityHeaders";
import { sanitizeInput } from "./middleware/validation";

async function startServer() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));
  app.use(compression());

  // Rate limiting
  app.use('/api/auth', authLimiter);
  app.use('/api/transactions', paymentLimiter);
  app.use('/api', apiLimiter);

  // Security headers first
  app.use(securityHeaders());
  app.use(corsHeaders());
  app.use(requestValidation());

  // CORS middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  }));

  // Express middleware with size limits
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      if (buf.length > 10 * 1024 * 1024) {
        throw new Error('Request entity too large');
      }
    }
  }));
  app.use(express.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 1000
  }));

  // Input sanitization
  app.use(sanitizeInput());

  // Session configuration
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool: db as any,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'strict'
      },
      name: 'sessionId' // Change default session name
    })
  );

  // Authentication setup
  app.use(setupAuth());

  // Register admin routes
  app.use('/api/admin', adminRoutes);

  // Register main API routes
  registerRoutes(app);

  // Register error logging route
  app.use('/api/errors', errorLoggingRoutes);

  // Error handling middleware (must be last)
  import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
  app.use(notFoundHandler);
  app.use(errorHandler);


  // Create HTTP server
  const server = createServer(app);

  // Setup WebSocket server
  const io = await setupWebSocketServer(server);

  // Make WebSocket server globally available for route handlers
  (global as any).io = io;
  app.set('server', { io });

  // Initialize live system service with WebSocket
  const { LiveSystemService } = await import('./services/live-system');
  LiveSystemService.setSocketIOInstance(io);

  // Setup Vite or static serving
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const PORT = parseInt(process.env.PORT || '5000', 10);
  server.listen(PORT, "0.0.0.0", () => {
    const formattedTime = new Intl.DateTimeFormat("en-US", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "UTC",
    }).format(new Date());

    console.log(`${formattedTime} [express] serving on port ${PORT}`);
  });

}

// Start the server
startServer().catch(console.error);