import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Start Vite dev server for client in development
if (process.env.NODE_ENV === 'development') {
  console.log('Starting Vite dev server for client...');
  const viteProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '../client'),
    stdio: 'pipe',
    shell: true
  });

  viteProcess.stdout.on('data', (data) => {
    console.log(`[Vite] ${data}`);
  });

  viteProcess.stderr.on('data', (data) => {
    console.log(`[Vite Error] ${data}`);
  });

  process.on('exit', () => {
    viteProcess.kill();
  });
}

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
  const { email, password, role, fullName, phone } = req.body;

  // Basic validation
  if (!email || !password || !role || !fullName) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Simulate user creation
  const user = {
    id: Date.now().toString(),
    email,
    fullName,
    phone,
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
      quickActions: ["Send Money", "Pay Bills", "Buy Airtime", "Fund Wallet", "View Transactions"]
    },
    MERCHANT: {
      revenue: "₦2,450,000.00",
      orders: 156,
      quickActions: ["View Orders", "Add Product", "Analytics", "Withdraw Funds", "KYC Status"]
    },
    DRIVER: {
      earnings: "₦85,500.00",
      trips: 42,
      quickActions: ["Start Trip", "View Earnings", "Update Status", "Fuel Delivery", "Trip History"]
    }
  };

  res.json(dashboardData[role as string] || dashboardData.CONSUMER);
});

// Wallet endpoints - Core wallet system
app.get("/api/wallet/balance", (req, res) => {
  // Simulate wallet balance fetch
  const walletData = {
    balance: 125450.00,
    currency: "NGN",
    formattedBalance: "₦125,450.00",
    lastUpdated: new Date().toISOString(),
    accountNumber: "1234567890",
    bankName: "Brill Prime Wallet"
  };

  res.json(walletData);
});

app.post("/api/wallet/fund", (req, res) => {
  const { amount, paymentMethod, reference } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  // Simulate wallet funding
  const transaction = {
    id: `fund_${Date.now()}`,
    type: "WALLET_FUNDING",
    amount: parseFloat(amount),
    currency: "NGN",
    status: "PENDING",
    reference: reference || `ref_${Date.now()}`,
    paymentMethod: paymentMethod || "card",
    createdAt: new Date().toISOString(),
    description: `Wallet funding of ₦${amount}`
  };

  // Simulate processing delay
  setTimeout(() => {
    console.log(`Wallet funding processed: ${transaction.id}`);
  }, 2000);

  res.status(201).json({ 
    message: "Wallet funding initiated", 
    transaction,
    paymentUrl: `https://checkout.paystack.com/demo/${transaction.reference}`
  });
});

app.get("/api/wallet/transactions", (req, res) => {
  const { page = 1, limit = 10, type } = req.query;

  // Simulate transaction history
  const transactions = [
    {
      id: "txn_001",
      type: "WALLET_FUNDING",
      amount: 50000,
      currency: "NGN",
      status: "COMPLETED",
      description: "Wallet funding via card",
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "txn_002", 
      type: "BILL_PAYMENT",
      amount: -2500,
      currency: "NGN",
      status: "COMPLETED",
      description: "Electricity bill payment",
      createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: "txn_003",
      type: "MONEY_TRANSFER",
      amount: -15000,
      currency: "NGN", 
      status: "COMPLETED",
      description: "Transfer to John Doe",
      createdAt: new Date(Date.now() - 259200000).toISOString()
    }
  ];

  // Filter by type if specified
  const filteredTransactions = type ? 
    transactions.filter(t => t.type === type) : 
    transactions;

  res.json({
    transactions: filteredTransactions,
    pagination: {
      currentPage: parseInt(page as string),
      totalPages: Math.ceil(filteredTransactions.length / parseInt(limit as string)),
      totalCount: filteredTransactions.length
    }
  });
});

// Bill payment endpoints
app.post("/api/bills/pay", (req, res) => {
  const { billType, amount, accountNumber, provider } = req.body;

  if (!billType || !amount || !accountNumber) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const transaction = {
    id: `bill_${Date.now()}`,
    type: "BILL_PAYMENT",
    billType,
    amount: parseFloat(amount),
    currency: "NGN", 
    accountNumber,
    provider,
    status: "PROCESSING",
    createdAt: new Date().toISOString()
  };

  res.json({ message: "Bill payment initiated", transaction });
});

// Money transfer endpoints
app.post("/api/transfer/send", (req, res) => {
  const { recipientAccount, amount, narration, transferType } = req.body;

  if (!recipientAccount || !amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid transfer details" });
  }

  const transaction = {
    id: `transfer_${Date.now()}`,
    type: "MONEY_TRANSFER",
    amount: parseFloat(amount),
    currency: "NGN",
    recipientAccount,
    narration: narration || "Money transfer",
    transferType: transferType || "internal",
    status: "PROCESSING",
    createdAt: new Date().toISOString()
  };

  res.json({ message: "Transfer initiated", transaction });
});

// Additional API endpoints will be added here as needed

// Handle frontend routing based on environment
if (process.env.NODE_ENV === 'development') {
  // In development, redirect to Vite dev server
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.redirect(`http://localhost:5173${req.path}`);
    } else {
      res.status(404).json({ message: "API endpoint not found" });
    }
  });
} else {
  // In production, serve built static files
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    } else {
      res.status(404).json({ message: "API endpoint not found" });
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
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
  - GET  /api/dashboard
  - GET  /api/wallet/balance
  - POST /api/wallet/fund
  - GET  /api/wallet/transactions
  - POST /api/bills/pay
  - POST /api/transfer/send`);
});