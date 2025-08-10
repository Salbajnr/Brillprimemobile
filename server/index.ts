import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { spawn } from "child_process";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import supportRoutes from "./routes/support";
import adminSupportRoutes from "./routes/admin-support";
import { db } from './db.js';
import { 
  notifications, 
  users, 
  orders, 
  driverProfiles, 
  merchantProfiles,
  supportTickets,
  transactions
} from '../shared/schema.js';
import { eq, desc, count, and, sum, sql } from 'drizzle-orm';

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

// Register routes
app.use('/api/support', supportRoutes);
app.use('/api/admin/support', adminSupportRoutes);

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

// Simple auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  // For development, we'll simulate authentication
  req.session = { userId: 1 };
  next();
};

// Dashboard data endpoint with real database integration
app.get("/api/dashboard", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const user = await storage.getUser(userId);

    if (!user) {
      // Return default consumer data if user not found
      return res.json({
        balance: "₦0.00",
        transactions: 0,
        quickActions: ["Send Money", "Pay Bills", "Buy Airtime", "Fund Wallet", "View Transactions"]
      });
    }

    const { role } = user;

    // Get role-specific dashboard data from database
    let dashboardData: any;

    switch (role) {
      case 'DRIVER':
        dashboardData = await storage.getDriverDashboardData(userId);
        const formattedDriverData = {
          earnings: `₦${dashboardData.todayEarnings.toLocaleString()}`,
          totalEarnings: `₦${dashboardData.totalEarnings.toLocaleString()}`,
          trips: dashboardData.todayDeliveries,
          totalTrips: dashboardData.totalDeliveries,
          completionRate: `${dashboardData.completionRate.toFixed(1)}%`,
          activeFuelOrders: dashboardData.activeFuelOrders,
          quickActions: ["Start Trip", "View Earnings", "Update Status", "Fuel Delivery", "Trip History"]
        };
        return res.json(formattedDriverData);

      case 'MERCHANT':
        dashboardData = await storage.getMerchantDashboardData(userId);
        const formattedMerchantData = {
          revenue: `₦${dashboardData.todayRevenue.toLocaleString()}`,
          totalRevenue: `₦${dashboardData.totalRevenue.toLocaleString()}`,
          orders: dashboardData.todayOrders,
          totalOrders: dashboardData.totalOrders,
          productStats: dashboardData.productStats,
          recentOrders: dashboardData.recentOrders,
          quickActions: ["View Orders", "Add Product", "Analytics", "Withdraw Funds", "KYC Status"]
        };
        return res.json(formattedMerchantData);

      case 'CONSUMER':
      default:
        dashboardData = await storage.getConsumerDashboardData(userId);
        const formattedConsumerData = {
          balance: `₦${dashboardData.balance.toLocaleString()}`,
          transactions: dashboardData.totalTransactions,
          totalSpent: `₦${dashboardData.totalSpent.toLocaleString()}`,
          successRate: `${dashboardData.successRate.toFixed(1)}%`,
          recentTransactions: dashboardData.recentTransactions,
          recentOrders: dashboardData.recentOrders,
          quickActions: ["Send Money", "Pay Bills", "Buy Airtime", "Fund Wallet", "View Transactions"]
        };
        return res.json(formattedConsumerData);
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    // Return fallback data on error
    res.json({
      balance: "₦0.00",
      transactions: 0,
      quickActions: ["Send Money", "Pay Bills", "Buy Airtime", "Fund Wallet", "View Transactions"]
    });
  }
});

// Wallet endpoints with real database integration
app.get("/api/wallet/balance", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const consumerData = await storage.getConsumerDashboardData(userId);

    const walletData = {
      balance: consumerData.balance,
      currency: "NGN",
      formattedBalance: `₦${consumerData.balance.toLocaleString()}`,
      lastUpdated: new Date().toISOString(),
      accountNumber: "1234567890",
      bankName: "Brill Prime Wallet"
    };

    res.json(walletData);
  } catch (error) {
    console.error('Wallet balance error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
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

app.get("/api/wallet/transactions", requireAuth, async (req: any, res: any) => {
  const { page = 1, limit = 10, type } = req.query;

  try {
    const userId = req.session.userId;
    const consumerData = await storage.getConsumerDashboardData(userId);

    const filteredTransactions = type ? 
      consumerData.recentTransactions.filter((t: any) => t.type === type) : 
      consumerData.recentTransactions;

    res.json({
      transactions: filteredTransactions,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages: Math.ceil(filteredTransactions.length / parseInt(limit as string)),
        totalCount: filteredTransactions.length
      }
    });
  } catch (error) {
    console.error('Wallet transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
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

// Fuel ordering system endpoints with real database integration
app.get("/api/fuel/orders", requireAuth, async (req: any, res: any) => {
  try {
    const { status, userId } = req.query;
    const currentUserId = req.session.userId;

    // Get driver's fuel orders from database
    const driverData = await storage.getDriverDashboardData(currentUserId);

    res.json(driverData.activeFuelOrders);
  } catch (error) {
    console.error('Fuel orders error:', error);
    res.status(500).json({ error: 'Failed to fetch fuel orders' });
  }
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

// Driver management endpoints with real database integration
app.get("/api/drivers", async (req, res) => {
  try {
    const { available, tier } = req.query;

    // Get drivers with their profiles
    const driversQuery = db.select({
      id: users.id,
      name: users.fullName,
      phone: users.phone,
      email: users.email,
      vehicleType: driverProfiles.vehicleType,
      vehicleModel: driverProfiles.vehicleModel,
      plateNumber: driverProfiles.plateNumber,
      isAvailable: driverProfiles.isAvailable,
      rating: driverProfiles.rating,
      totalTrips: driverProfiles.totalTrips,
      earnings: driverProfiles.earnings,
      currentLatitude: driverProfiles.currentLatitude,
      currentLongitude: driverProfiles.currentLongitude,
      createdAt: users.createdAt
    })
    .from(users)
    .leftJoin(driverProfiles, eq(users.id, driverProfiles.userId))
    .where(eq(users.role, 'DRIVER'));

    const drivers = await driversQuery;

    let filteredDrivers = drivers.filter(driver => driver.vehicleType); // Only drivers with profiles

    if (available !== undefined) {
      filteredDrivers = filteredDrivers.filter(d => d.isAvailable === (available === 'true'));
    }

    const formattedDrivers = filteredDrivers.map(driver => ({
      id: `driver_${driver.id}`,
      name: driver.name,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      vehicleModel: driver.vehicleModel,
      plateNumber: driver.plateNumber,
      tier: "STANDARD", // Default tier, can be added to schema later
      rating: parseFloat(driver.rating || '0'),
      available: driver.isAvailable,
      location: {
        lat: parseFloat(driver.currentLatitude || '6.5244'),
        lng: parseFloat(driver.currentLongitude || '3.3792')
      },
      totalDeliveries: driver.totalTrips,
      earnings: parseFloat(driver.earnings || '0'),
      registeredAt: driver.createdAt
    }));

    res.json(formattedDrivers);
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

app.post("/api/drivers/register", async (req, res) => {
  try {
    const { name, phone, vehicleType, licenseNumber, vehicleModel, plateNumber } = req.body;

    if (!name || !phone || !vehicleType || !licenseNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create user account for driver
    const userData = {
      fullName: name,
      phone,
      role: 'DRIVER' as const,
      email: `${phone.replace(/[^0-9]/g, '')}@driver.brillprime.com`, // Generate email from phone
      password: null, // Driver will set password later
      isVerified: false
    };

    const user = await storage.createUser(userData);

    // Create driver profile
    const driverProfileData = {
      userId: user.id,
      vehicleType,
      vehicleModel: vehicleModel || null,
      plateNumber: plateNumber || null,
      licenseNumber,
      isAvailable: false,
      rating: '5.0',
      totalTrips: 0,
      earnings: '0'
    };

    await db.insert(driverProfiles).values(driverProfileData);

    res.status(201).json({ 
      message: "Driver registration submitted successfully", 
      driver: {
        id: user.id,
        name: user.fullName,
        phone: user.phone,
        vehicleType,
        verificationStatus: "PENDING",
        registeredAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({ error: 'Failed to register driver' });
  }
});

// Merchant analytics endpoint
app.get("/api/merchant/analytics", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const { range = '30d' } = req.query;

    // Mock analytics data - in production this would come from database
    const analytics = {
      revenue: {
        total: 2450000,
        thisMonth: 340000,
        lastMonth: 285000,
        growth: 19.3
      },
      orders: {
        total: 456,
        thisMonth: 67,
        pending: 12,
        completed: 398,
        cancelled: 46
      },
      customers: {
        total: 234,
        new: 23,
        returning: 211,
        retention: 89.7
      },
      products: {
        bestselling: [
          { id: "1", name: "Premium Petrol", sales: 1200, revenue: 740400 },
          { id: "2", name: "Diesel Fuel", sales: 890, revenue: 578340 },
          { id: "3", name: "Kerosene", sales: 456, revenue: 182400 }
        ],
        lowStock: [
          { id: "4", name: "Engine Oil", stock: 5 },
          { id: "5", name: "Car Battery", stock: 3 }
        ]
      },
      ratings: {
        average: 4.7,
        total: 89,
        distribution: { 5: 45, 4: 32, 3: 8, 2: 3, 1: 1 }
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Merchant analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Merchant endpoints with real database integration
app.get("/api/merchants", async (req, res) => {
  try {
    const { verified, category } = req.query;

    // Get merchants with their profiles
    const merchantsQuery = db.select({
      id: users.id,
      ownerName: users.fullName,
      phone: users.phone,
      email: users.email,
      isVerified: users.isVerified,
      businessName: merchantProfiles.businessName,
      businessAddress: merchantProfiles.businessAddress,
      businessType: merchantProfiles.businessType,
      isOpen: merchantProfiles.isOpen,
      rating: merchantProfiles.rating,
      totalOrders: merchantProfiles.totalOrders,
      revenue: merchantProfiles.revenue,
      createdAt: users.createdAt
    })
    .from(users)
    .leftJoin(merchantProfiles, eq(users.id, merchantProfiles.userId))
    .where(eq(users.role, 'MERCHANT'));

    const merchants = await merchantsQuery;

    let filteredMerchants = merchants.filter(merchant => merchant.businessName); // Only merchants with profiles

    if (verified !== undefined) {
      filteredMerchants = filteredMerchants.filter(m => m.isVerified === (verified === 'true'));
    }
    if (category) {
      filteredMerchants = filteredMerchants.filter(m => m.businessType === category);
    }

    const formattedMerchants = filteredMerchants.map(merchant => ({
      id: `merchant_${merchant.id}`,
      businessName: merchant.businessName,
      ownerName: merchant.ownerName,
      phone: merchant.phone,
      category: merchant.businessType || "GENERAL",
      address: merchant.businessAddress,
      verified: merchant.isVerified,
      rating: parseFloat(merchant.rating || '0'),
      kycStatus: merchant.isVerified ? "APPROVED" : "PENDING",
      revenue: parseFloat(merchant.revenue || '0'),
      orders: merchant.totalOrders || 0,
      isOpen: merchant.isOpen,
      joinedAt: merchant.createdAt
    }));

    res.json(formattedMerchants);
  } catch (error) {
    console.error('Get merchants error:', error);
    res.status(500).json({ error: 'Failed to fetch merchants' });
  }
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

// Real-time tracking endpoints with database integration
app.get("/api/tracking/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get order details with driver information
    const [orderDetails] = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      driverId: orders.driverId,
      deliveryAddress: orders.deliveryAddress,
      deliveryLatitude: orders.deliveryLatitude,
      deliveryLongitude: orders.deliveryLongitude,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      driverName: users.fullName,
      driverPhone: users.phone,
      currentLatitude: driverProfiles.currentLatitude,
      currentLongitude: driverProfiles.currentLongitude
    })
    .from(orders)
    .leftJoin(users, eq(orders.driverId, users.id))
    .leftJoin(driverProfiles, eq(orders.driverId, driverProfiles.userId))
    .where(eq(orders.id, parseInt(orderId)))
    .limit(1);

    if (!orderDetails) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Calculate completion percentage based on status
    const statusPercentage = {
      'PENDING': 10,
      'CONFIRMED': 25,
      'IN_PROGRESS': 50,
      'DELIVERED': 100,
      'CANCELLED': 0
    };

    const trackingData = {
      orderId: orderDetails.id,
      orderNumber: orderDetails.orderNumber,
      status: orderDetails.status,
      driverLocation: {
        lat: parseFloat(orderDetails.currentLatitude || '6.5244'),
        lng: parseFloat(orderDetails.currentLongitude || '3.3792')
      },
      deliveryLocation: {
        lat: parseFloat(orderDetails.deliveryLatitude || '6.5244'),
        lng: parseFloat(orderDetails.deliveryLongitude || '3.3792'),
        address: orderDetails.deliveryAddress
      },
      driverInfo: orderDetails.driverId ? {
        name: orderDetails.driverName,
        phone: orderDetails.driverPhone
      } : null,
      estimatedArrival: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
      completionPercentage: statusPercentage[orderDetails.status as keyof typeof statusPercentage] || 0,
      lastUpdate: orderDetails.updatedAt?.toISOString() || new Date().toISOString(),
      totalAmount: parseFloat(orderDetails.totalAmount)
    };

    res.json(trackingData);
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({ error: 'Failed to fetch tracking data' });
  }
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

// Admin endpoints with real database queries
app.get("/api/admin/stats", async (req, res) => {
  try {
    // Get total users by role
    const [userStats] = await db.select({
      totalUsers: count(),
      totalDrivers: sql<number>`count(case when role = 'DRIVER' then 1 end)`,
      totalMerchants: sql<number>`count(case when role = 'MERCHANT' then 1 end)`,
      totalConsumers: sql<number>`count(case when role = 'CONSUMER' then 1 end)`
    }).from(users);

    // Get transaction stats
    const [transactionStats] = await db.select({
      totalTransactions: count(),
      totalRevenue: sum(transactions.amount)
    }).from(transactions);

    // Get active orders
    const [orderStats] = await db.select({
      activeOrders: count(),
      pendingOrders: sql<number>`count(case when status = 'PENDING' then 1 end)`
    }).from(orders).where(
      sql`status NOT IN ('DELIVERED', 'CANCELLED')`
    );

    // Get pending KYC count
    const [kycStats] = await db.select({
      pendingKyc: count()
    }).from(users).where(eq(users.isVerified, false));

    const stats = {
      totalUsers: userStats.totalUsers || 0,
      totalDrivers: userStats.totalDrivers || 0,
      totalMerchants: userStats.totalMerchants || 0,
      totalConsumers: userStats.totalConsumers || 0,
      totalTransactions: transactionStats.totalTransactions || 0,
      totalRevenue: parseFloat(transactionStats.totalRevenue?.toString() || '0'),
      activeOrders: orderStats.activeOrders || 0,
      pendingOrders: orderStats.pendingOrders || 0,
      pendingKyc: kycStats.pendingKyc || 0,
      flaggedTransactions: 0 // This would come from a fraud detection system
    };

    res.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = db.select().from(users);

    if (role) {
      query = query.where(eq(users.role, role as string));
    }

    const allUsers = await query.limit(parseInt(limit as string)).offset(offset);
    const totalCount = await db.select({ count: count() }).from(users);

    const formattedUsers = allUsers.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.isVerified ? "ACTIVE" : "PENDING",
      joinDate: user.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      lastActive: user.updatedAt?.toISOString() || new Date().toISOString()
    }));

    res.json({
      users: formattedUsers,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages: Math.ceil(totalCount[0].count / parseInt(limit as string)),
        totalCount: totalCount[0].count
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
});

// Notification endpoints with real database integration
app.get("/api/notifications", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const { read, limit = 10 } = req.query;

    const userNotifications = await storage.getNotifications(userId, parseInt(limit as string));
    
    const filteredNotifications = read !== undefined 
      ? userNotifications.filter(n => n.isRead === (read === 'true'))
      : userNotifications;

    const formattedNotifications = filteredNotifications.map(notification => ({
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.isRead,
      timestamp: notification.createdAt?.toISOString(),
      metadata: notification.metadata
    }));

    res.json(formattedNotifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.put("/api/notifications/:id/read", requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // Update notification read status
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, parseInt(id)),
        eq(notifications.userId, userId)
      ));

    res.json({ message: "Notification marked as read", id });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
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