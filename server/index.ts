import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { spawn } from "child_process";
import { Server as SocketIOServer } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Initialize Socket.IO for real-time features
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "https://*.replit.dev"],
    methods: ["GET", "POST"]
  },
  path: '/socket.io'
});

// Simple WebSocket handlers for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    socket.emit('connection_ack', { status: 'connected', userId });
  });

  // Order tracking room
  socket.on('join_order_room', (orderId) => {
    socket.join(`order_${orderId}`);
  });

  // Live location updates for drivers
  socket.on('location_update', (data) => {
    socket.to(`order_${data.orderId}`).emit('driver_location', data);
  });

  // Order status updates
  socket.on('order_status_update', (data) => {
    io.to(`order_${data.orderId}`).emit('order_update', data);
  });

  // Notifications
  socket.on('send_notification', (data) => {
    io.to(`user_${data.userId}`).emit('notification', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

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
app.get("/api/dashboard", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { role } = user;

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

// Fuel ordering system endpoints
app.get("/api/fuel/orders", (req, res) => {
  const { status, userId } = req.query;

  const mockOrders = [
    {
      id: "fo_001",
      customerId: "user_001",
      driverId: "driver_001", 
      fuelType: "PMS",
      quantity: 20,
      unitPrice: 617,
      totalAmount: 12340,
      deliveryAddress: "123 Victoria Island, Lagos",
      status: "PENDING",
      orderDate: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 3600000).toISOString()
    }
  ];

  res.json(mockOrders);
});

app.post("/api/fuel/orders", (req, res) => {
  const { fuelType, quantity, deliveryAddress, paymentMethod } = req.body;

  if (!fuelType || !quantity || !deliveryAddress) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const order = {
    id: `fo_${Date.now()}`,
    customerId: "user_001",
    fuelType,
    quantity: parseFloat(quantity),
    unitPrice: 617,
    totalAmount: parseFloat(quantity) * 617,
    deliveryAddress,
    paymentMethod: paymentMethod || "wallet",
    status: "PENDING",
    orderDate: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 3600000).toISOString()
  };

  res.status(201).json({ message: "Fuel order created", order });
});

// Driver management endpoints
app.get("/api/drivers", (req, res) => {
  const { available, tier } = req.query;

  const mockDrivers = [
    {
      id: "driver_001",
      name: "Ahmed Musa",
      phone: "+2348123456789",
      vehicleType: "Fuel Truck",
      tier: "PREMIUM",
      rating: 4.8,
      available: true,
      location: { lat: 6.5244, lng: 3.3792 },
      totalDeliveries: 156,
      earnings: 85500
    },
    {
      id: "driver_002", 
      name: "Kemi Adebayo",
      phone: "+2348123456790",
      vehicleType: "Mini Truck",
      tier: "STANDARD",
      rating: 4.6,
      available: false,
      location: { lat: 6.5244, lng: 3.3792 },
      totalDeliveries: 89,
      earnings: 52300
    }
  ];

  let filteredDrivers = mockDrivers;
  if (available !== undefined) {
    filteredDrivers = filteredDrivers.filter(d => d.available === (available === 'true'));
  }
  if (tier) {
    filteredDrivers = filteredDrivers.filter(d => d.tier === tier);
  }

  res.json(filteredDrivers);
});

app.post("/api/drivers/register", (req, res) => {
  const { name, phone, vehicleType, licenseNumber, tier } = req.body;

  if (!name || !phone || !vehicleType || !licenseNumber) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const driver = {
    id: `driver_${Date.now()}`,
    name,
    phone,
    vehicleType,
    licenseNumber,
    tier: tier || "STANDARD",
    rating: 0,
    available: false,
    verificationStatus: "PENDING",
    registeredAt: new Date().toISOString()
  };

  res.status(201).json({ message: "Driver registration submitted", driver });
});

// Merchant endpoints
app.get("/api/merchants", (req, res) => {
  const { verified, category } = req.query;

  const mockMerchants = [
    {
      id: "merchant_001",
      businessName: "Lagos Fuel Station",
      ownerName: "John Doe",
      phone: "+2348123456791",
      category: "FUEL_STATION", 
      address: "45 Allen Avenue, Ikeja, Lagos",
      verified: true,
      rating: 4.7,
      kycStatus: "APPROVED",
      revenue: 2450000,
      orders: 156
    }
  ];

  let filteredMerchants = mockMerchants;
  if (verified !== undefined) {
    filteredMerchants = filteredMerchants.filter(m => m.verified === (verified === 'true'));
  }
  if (category) {
    filteredMerchants = filteredMerchants.filter(m => m.category === category);
  }

  res.json(filteredMerchants);
});

app.post("/api/merchants/kyc", (req, res) => {
  const { businessName, ownerName, address, businessRegistration, taxId } = req.body;

  if (!businessName || !ownerName || !address) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const kycSubmission = {
    id: `kyc_${Date.now()}`,
    businessName,
    ownerName,
    address,
    businessRegistration,
    taxId,
    status: "PENDING",
    submittedAt: new Date().toISOString()
  };

  res.status(201).json({ message: "KYC submitted for review", submission: kycSubmission });
});

// Real-time tracking endpoints
app.get("/api/tracking/:orderId", (req, res) => {
  const { orderId } = req.params;

  const trackingData = {
    orderId,
    status: "IN_TRANSIT",
    driverLocation: { lat: 6.5244, lng: 3.3792 },
    estimatedArrival: new Date(Date.now() + 1800000).toISOString(),
    completionPercentage: 65,
    lastUpdate: new Date().toISOString()
  };

  res.json(trackingData);
});

// QR code toll payment endpoints
app.post("/api/toll/scan", (req, res) => {
  const { qrCode, amount } = req.body;

  if (!qrCode) {
    return res.status(400).json({ message: "QR code required" });
  }

  const tollPayment = {
    id: `toll_${Date.now()}`,
    qrCode,
    amount: amount || 500,
    currency: "NGN",
    tollGate: "Lagos-Ibadan Expressway - Ibafo",
    status: "PROCESSING",
    timestamp: new Date().toISOString()
  };

  res.json({ message: "Toll payment initiated", payment: tollPayment });
});

// Admin endpoints
app.get("/api/admin/stats", (req, res) => {
  const stats = {
    totalUsers: 15420,
    totalDrivers: 892,
    totalMerchants: 156,
    totalTransactions: 28945,
    totalRevenue: 125450000,
    activeOrders: 23,
    pendingKyc: 12,
    flaggedTransactions: 3
  };

  res.json(stats);
});

app.get("/api/admin/users", (req, res) => {
  const { role, status, page = 1 } = req.query;

  const mockUsers = [
    {
      id: "user_001",
      email: "user@example.com",
      fullName: "John Consumer",
      role: "CONSUMER",
      status: "ACTIVE",
      joinDate: "2024-01-15",
      lastActive: new Date().toISOString()
    },
    {
      id: "merchant_001", 
      email: "merchant@example.com",
      fullName: "Jane Merchant",
      role: "MERCHANT",
      status: "ACTIVE",
      joinDate: "2024-02-01",
      lastActive: new Date().toISOString()
    }
  ];

  res.json({
    users: mockUsers,
    pagination: {
      currentPage: parseInt(page as string),
      totalPages: 1,
      totalCount: mockUsers.length
    }
  });
});

// Notification endpoints
app.get("/api/notifications", (req, res) => {
  const { userId, read } = req.query;

  const mockNotifications = [
    {
      id: 1,
      userId: "user_001",
      title: "Payment Successful",
      message: "Your fuel order payment of ₦12,340 was successful",
      type: "success",
      read: false,
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      userId: "user_001", 
      title: "Driver Assigned",
      message: "Ahmed has been assigned to deliver your fuel order",
      type: "info",
      read: true,
      timestamp: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  res.json(mockNotifications);
});

app.put("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;

  res.json({ message: "Notification marked as read", id });
});

// Websocket connection status endpoint
app.get("/api/websocket/status", (req, res) => {
  res.json({ 
    connected: true,
    activeConnections: 156,
    lastHeartbeat: new Date().toISOString()
  });
});

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
  - POST /api/transfer/send
  - GET  /api/fuel/orders
  - POST /api/fuel/orders
  - GET  /api/drivers
  - POST /api/drivers/register
  - GET  /api/merchants
  - POST /api/merchants/kyc
  - GET  /api/tracking/:orderId
  - POST /api/toll/scan
  - GET  /api/admin/stats
  - GET  /api/admin/users
  - GET  /api/notifications
  - PUT  /api/notifications/:id/read
  - GET  /api/websocket/status`);
});