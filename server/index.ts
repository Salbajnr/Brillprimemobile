import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "https://*.replit.dev"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 1000 * 60 * 60 * 24 * 7 
  }
}));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Basic user endpoint
app.get("/api/users", (req, res) => {
  res.json([
    { id: "1", name: "Test User", role: "CONSUMER" },
    { id: "2", name: "Test Merchant", role: "MERCHANT" }
  ]);
});

// Auth endpoints
app.post("/api/auth/signup", (req, res) => {
  const { email, password, role } = req.body;
  // Basic validation
  if (!email || !password || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  
  // Simulate user creation
  const user = {
    id: Date.now().toString(),
    email,
    role,
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json({ message: "User created successfully", user });
});

app.post("/api/auth/signin", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
  
  // Simulate authentication
  const user = {
    id: "1",
    email,
    role: "CONSUMER"
  };
  
  res.json({ message: "Sign in successful", user });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { otp, phone } = req.body;
  
  if (!otp || otp.length !== 6) {
    return res.status(400).json({ message: "Valid 6-digit OTP required" });
  }
  
  // Simulate OTP verification
  res.json({ message: "OTP verified successfully", verified: true });
});

// Dashboard data endpoint
app.get("/api/dashboard", (req, res) => {
  const { role } = req.query;
  
  const dashboardData = {
    CONSUMER: {
      balance: "₦125,450.00",
      transactions: 23,
      quickActions: ["Send Money", "Pay Bills", "Buy Airtime"]
    },
    MERCHANT: {
      revenue: "₦2,450,000.00",
      orders: 156,
      quickActions: ["View Orders", "Add Product", "Analytics"]
    },
    DRIVER: {
      earnings: "₦85,500.00",
      trips: 42,
      quickActions: ["Start Trip", "View Earnings", "Update Status"]
    }
  };
  
  res.json(dashboardData[role as string] || dashboardData.CONSUMER);
});

// Serve the React application
app.use(express.static(path.join(__dirname, '../client')));

// Serve the React app for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  } else {
    res.status(404).json({ message: "API endpoint not found" });
  }
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`[${new Date().toISOString()}] Error:`, err);
  res.status(status).json({ message });
});

// Start server - Replit expects port 5000 for workflows
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
server.listen(port, '0.0.0.0', () => {
  console.log(`[${new Date().toLocaleTimeString()}] Brill Prime server running on port ${port}`);
  console.log(`API endpoints available:
  - GET  /api/health
  - GET  /api/users
  - POST /api/auth/signup
  - POST /api/auth/signin
  - POST /api/auth/verify-otp
  - GET  /api/dashboard`);
});