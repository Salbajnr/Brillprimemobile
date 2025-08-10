
import express from "express";
import session from "express-session";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from "./routes/auth";
import paymentsRoutes from "./routes/payments";
import productsRoutes from "./routes/products";
import driverRoutes from "./routes/driver";
import merchantRoutes from "./routes/merchant";
import walletRoutes from "./routes/wallet";
import dashboardRoutes from "./routes/dashboard";
import fuelOrdersRoutes from "./routes/fuel-orders";
import verificationRoutes from "./routes/verification";
import simpleVerificationRoutes from "./routes/simple-verification";
import tollPaymentsRoutes from "./routes/toll-payments";
import qrPaymentsRoutes from "./routes/qr-payments";
import escrowRoutes from "./routes/escrow";
import secureTransactionsRoutes from "./routes/secure-transactions";
import analyticsRoutes from "./routes/analytics";
import adminOversightRoutes from "./routes/admin-oversight";
import liveSystemRoutes from "./routes/live-system";
import liveChatRoutes from "./routes/live-chat";
import vendorFeedRoutes from "./routes/vendor-feed";
import adminRoutes from "./admin/routes";
import supportRoutes from "./routes/support";
import adminSupportRoutes from "./routes/admin-support";
import realTimeTrackingRoutes from "./routes/real-time-tracking";
import driverLocationRoutes from "./routes/driver-location";
import paystackWebhooksRoutes from "./routes/paystack-webhooks";
import escrowManagementRoutes from "./routes/escrow-management";
import withdrawalSystemRoutes from "./routes/withdrawal-system";
import enhancedVerificationRoutes from "./routes/enhanced-verification";
import mfaAuthenticationRoutes from "./routes/mfa-authentication";

// Import services
import { initializeWebSocket } from "./websocket";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? ["https://*.replit.dev", "https://*.replit.com"] 
      : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true
  }
});

// Make io globally available
declare global {
  var io: Server;
}
global.io = io;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // limit each IP
  message: "Too many requests from this IP, please try again later."
});

// Middleware
app.use(limiter);
app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? ["https://*.replit.dev", "https://*.replit.com"] 
    : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/merchants", merchantRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/fuel", fuelOrdersRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/verification-simple", simpleVerificationRoutes);
app.use("/api/toll", tollPaymentsRoutes);
app.use("/api/qr", qrPaymentsRoutes);
app.use("/api/escrow", escrowRoutes);
app.use("/api/secure-transactions", secureTransactionsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin-oversight", adminOversightRoutes);
app.use("/api/live-system", liveSystemRoutes);
app.use("/api/live-chat", liveChatRoutes);
app.use("/api/vendor-feed", vendorFeedRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin-support", adminSupportRoutes);
app.use("/api/tracking", realTimeTrackingRoutes);
app.use("/api/drivers/location", driverLocationRoutes);
app.use("/api/webhooks/paystack", paystackWebhooksRoutes);
app.use("/api/escrow-management", escrowManagementRoutes);
app.use("/api/withdrawal", withdrawalSystemRoutes);
app.use("/api/verification-enhanced", enhancedVerificationRoutes);
app.use("/api/mfa", mfaAuthenticationRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Initialize WebSocket
initializeWebSocket(io);

// Handle 404 for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 WebSocket enabled for real-time features`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;
