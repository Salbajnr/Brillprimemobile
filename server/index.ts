import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import session from "express-session";
import { setupVite, serveStatic, log } from "./vite";
import { registerRoutes } from "./routes";
import { setupAuth } from "./middleware/auth";
import { setupWebSocketServer } from "./websocket";
import { setupAdminRoutes } from "./admin/routes";
import { adminAuth } from "./middleware/adminAuth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-development',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Setup authentication middleware
app.use(setupAuth());

// Setup admin panel routes with authentication
app.use('/admin/api', adminAuth, setupAdminRoutes());

// Simple logging middleware for development
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  // Register API routes first
  const server = await registerRoutes(app);
  
  // Setup WebSocket server only in production
  if (app.get("env") !== "development") {
    setupWebSocketServer(server);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`HTTP and WebSocket server running on port ${port}`);
  });
})();
