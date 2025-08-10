import express from "express";
import type { Express } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import session from "express-session";
import bcrypt from "bcrypt";
import { z } from "zod";
import { db, dbOperations } from "./db";
import { users, insertUserSchema } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { setupAuth, requireAuth } from "./middleware/auth";
import { liveChatHandler } from "./websocket/live-system-handler";
import paymentsRouter from "./routes/payments";
import { validateEnvironment } from "./env-validation";

// Validate environment variables on startup
const env = validateEnvironment();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Setup WebSocket
setupWebSocket(server);

// Security middleware
import { setupAuth, requireAuth } from "./middleware/auth";
import { sanitizeInput, securityLogger } from "./middleware/validation";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter";
import helmet from "helmet";

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);

// Security logging
app.use(securityLogger());

// Input sanitization
app.use(sanitizeInput());

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


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
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// Setup authentication middleware after session
setupAuth(app);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Basic user endpoint
app.get("/api/users", requireAuth, async (req, res) => {
  try {
    const users = await dbOperations.getAllUsers();
    res.json(users.map(user => ({ id: user.id, name: user.fullName, role: user.role })));
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Authentication routes with enhanced validation
import { validateSchema, commonSchemas } from "./middleware/validation";
import { hashPassword, comparePassword, generateToken } from "./middleware/auth";
import { registrationLimiter, passwordResetLimiter } from "./middleware/rateLimiter";

const signupSchema = z.object({
  fullName: z.string().min(2).max(100).regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: commonSchemas.email,
  password: commonSchemas.password,
  role: z.enum(['CONSUMER', 'MERCHANT', 'DRIVER']),
  phoneNumber: commonSchemas.phoneNumber.optional(),
  agreeToTerms: z.boolean().refine(val => val === true, 'Must agree to terms')
});

const signinSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1, 'Password required')
});

app.post("/api/auth/signup", registrationLimiter, validateSchema(signupSchema), async (req, res) => {
  try {
    const { email, password, fullName, phone, role, agreeToTerms } = req.body;

    if (!agreeToTerms) {
      return res.status(400).json({ success: false, error: "You must agree to the terms and conditions" });
    }

    // Check if user already exists
    const existingUser = await dbOperations.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user in database
    const newUser = await dbOperations.createUser({
      email,
      passwordHash: hashedPassword,
      fullName,
      phoneNumber: phone,
      role,
      isVerified: false,
      isActive: true
    });

    // Store in session with enhanced security
    req.session.userId = newUser.id;
    req.session.user = {
      id: newUser.id,
      userId: newUser.userId,
      fullName: newUser.fullName,
      email: newUser.email,
      role: newUser.role,
      isVerified: newUser.isVerified,
      profilePicture: newUser.profilePicture
    };
    req.session.lastActivity = Date.now();
    req.session.ipAddress = req.ip;
    req.session.userAgent = req.headers['user-agent'];

    res.status(201).json({ success: true, user: { ...newUser, passwordHash: undefined }, requiresVerification: true });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, error: "Signup failed" });
  }
});

app.post("/api/auth/signin", authLimiter, validateSchema(signinSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user from database
    const user = await dbOperations.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ success: false, error: "Account is deactivated" });
    }

    // Update session with enhanced security
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture
    };
    req.session.lastActivity = Date.now();
    req.session.ipAddress = req.ip;
    req.session.userAgent = req.headers['user-agent'];

    res.json({ success: true, user: { ...user, passwordHash: undefined } });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ success: false, error: "Signin failed" });
  }
});

// Logout endpoint
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Could not log out" });
    }
    res.clearCookie("connect.sid", { path: "/" }); // Clear session cookie
    res.json({ message: "Logged out successfully" });
  });
});

// Get current user endpoint
app.get("/api/auth/me", (req, res) => {
  if (req.session.user) {
    // Regenerate session to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regeneration failed:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      // Re-assign user data to the new session
      req.session.userId = req.session.userId;
      req.session.user = req.session.user;
      req.session.lastActivity = Date.now();
      req.session.ipAddress = req.ip;
      req.session.userAgent = req.headers['user-agent'];

      return res.json({ user: { ...req.session.user, passwordHash: undefined } });
    });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});


// Dashboard endpoint
app.get("/api/dashboard", requireAuth, async (req, res) => {
  // Session validation for activity and IP address
  if (!req.session.user || !req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const currentTime = Date.now();
  const sessionTimeout = 1000 * 60 * 15; // 15 minutes inactivity timeout

  if (currentTime - (req.session.lastActivity || 0) > sessionTimeout) {
    return res.status(401).json({ message: "Session timed out due to inactivity" });
  }

  if (req.ip !== req.session.ipAddress || req.headers['user-agent'] !== req.session.userAgent) {
    return res.status(401).json({ message: "Session validation failed (IP or User-Agent mismatch)" });
  }

  // Update last activity time
  req.session.lastActivity = currentTime;

  try {
    const userId = req.session.userId;
    const user = await dbOperations.getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user orders
    const orders = await dbOperations.getOrdersByUserId(userId, user.role);

    // Get user transactions
    const transactions = await dbOperations.getTransactionsByUserId(userId);

    // Get user notifications
    const notifications = await dbOperations.getNotificationsByUserId(userId);

    // Calculate stats
    const completedOrders = orders.filter(order => order.status === 'DELIVERED');
    const pendingOrders = orders.filter(order => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(order.status));
    const totalSpent = transactions
      .filter(tx => tx.paymentStatus === 'COMPLETED')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const dashboard = {
      user: { ...user, passwordHash: undefined },
      stats: {
        totalOrders: orders.length,
        pendingOrders: pendingOrders.length,
        completedOrders: completedOrders.length,
        totalSpent
      },
      recentOrders: orders.slice(0, 5).map(order => ({
        id: order.orderNumber,
        type: order.orderType,
        status: order.status,
        amount: parseFloat(order.totalAmount),
        date: order.createdAt
      })),
      notifications: notifications.slice(0, 10)
    };

    res.json(dashboard);
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

// Import and register all route modules
import adminRoutes from "./admin/routes.js";
import merchantRoutes from "./routes/merchant.js";
import driverRoutes from "./routes/driver.js";
import tollPaymentsRoutes from "./routes/toll-payments.js";
import verificationRoutes from "./routes/verification.js";
import paymentRoutes from "./routes/payments.js";
import productsRoutes from "./routes/products.js";
import fuelOrdersRoutes from "./routes/fuel-orders.js";
import qrPaymentsRoutes from "./routes/qr-payments.js";
import liveChatRoutes from "./routes/live-chat.js";
import analyticsRoutes from "./routes/analytics.js";
import escrowRoutes from "./routes/escrow-management.js";
import orderStatusRoutes from "./routes/order-status.js";
import realTimeTrackingRoutes from "./routes/real-time-tracking.js";
import secureTransactionsRoutes from "./routes/secure-transactions.js";
import vendorFeedRoutes from "./routes/vendor-feed.js";
import ratingsReviewsRoutes from "./routes/ratings-reviews.js";
import liveSystemRoutes from "./routes/live-system.js";
import merchantKycRoutes from "./routes/merchant-kyc.js";
import roleManagementRoutes from "./routes/role-management.js";
import simpleVerificationRoutes from "./routes/simple-verification.js";
import fileSyncRoutes from "./routes/file-sync.js";
import errorLoggingRoutes from "./routes/error-logging.js";
import analyticsLoggingRoutes from "./routes/analytics-logging.js";
import adminOversightRoutes from "./routes/admin-oversight.js";
import adminMerchantKycRoutes from "./routes/admin-merchant-kyc.js";
import driverMerchantCoordinationRoutes from "./routes/driver-merchant-coordination.js";
import locationRecommendationsRoutes from "./routes/location-recommendations.js";
import testRealtimeRoutes from "./routes/test-realtime.js";

// Register route modules with proper prefixes
app.use("/api/admin", adminRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/toll", tollPaymentsRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/fuel-orders", fuelOrdersRoutes);
app.use("/api/qr-payments", qrPaymentsRoutes);
app.use("/api/chat", liveChatRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/escrow", escrowRoutes);
app.use("/api/order-status", orderStatusRoutes);
app.use("/api/tracking", realTimeTrackingRoutes);
app.use("/api/secure-transactions", secureTransactionsRoutes);
app.use("/api/vendor-feed", vendorFeedRoutes);
app.use("/api/ratings", ratingsReviewsRoutes);
app.use("/api/live-system", liveSystemRoutes);
app.use("/api/merchant-kyc", merchantKycRoutes);
app.use("/api/roles", roleManagementRoutes);
app.use("/api/simple-verification", simpleVerificationRoutes);
app.use("/api/file-sync", fileSyncRoutes);
app.use("/api/error-logging", errorLoggingRoutes);
app.use("/api/analytics-logging", analyticsLoggingRoutes);
app.use("/api/admin-oversight", adminOversightRoutes);
app.use("/api/admin-merchant-kyc", adminMerchantKycRoutes);
app.use("/api/driver-merchant", driverMerchantCoordinationRoutes);
app.use("/api/location-recommendations", locationRecommendationsRoutes);
app.use("/api/test-realtime", testRealtimeRoutes);


// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
} else {
  // Development mode - build and serve the client
  console.log('Development mode: building and serving React client');

  const clientBuildPath = path.join(__dirname, "../client/dist");
  const clientHtmlPath = path.join(clientBuildPath, "index.html");

  // Serve static assets from client/src/assets during development
  app.use('/src/assets', express.static(path.join(__dirname, '../client/src/assets')));

  // Check if client build exists, if not serve from source
  if (fs.existsSync(clientHtmlPath)) {
    console.log('Serving React client from build directory');
    app.use(express.static(clientBuildPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      res.sendFile(clientHtmlPath);
    });
  } else {
    console.log('Client build not found, using fallback HTML with React CDN');
    // Serve a simple HTML that loads React from CDN
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brill Prime - Financial Solutions</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect } = React;

        function SplashPage({ onComplete }) {
          useEffect(() => {
            console.log('Brill Prime app initializing...');
            const timer = setTimeout(() => {
              console.log('Splash timeout complete');
              const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
              if (hasSeenOnboarding) {
                console.log('User has seen onboarding, showing role selection');
                onComplete('role-selection');
              } else {
                console.log('First time user, showing onboarding');
                onComplete('onboarding');
              }
            }, 3000);
            return () => clearTimeout(timer);
          }, []);

          return (
            <div className="flex flex-col items-center justify-center min-h-screen max-w-md mx-auto relative overflow-hidden bg-white">
              <div className="w-48 h-48 flex items-center justify-center animate-pulse">
                <img src="/src/assets/images/logo.png" alt="Brill Prime Logo" className="w-full h-full object-contain max-w-44 max-h-44" onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }} />
                <div className="w-40 h-40 bg-blue-600 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-lg" style={{display: 'none'}}>B</div>
              </div>
              <div className="mt-6 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Brill Prime</h1>
                <p className="text-gray-600 text-sm">Financial Solutions</p>
              </div>
              <div className="flex gap-2 mt-8">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          );
        }

        function OnboardingPage({ onComplete }) {
          const [currentStep, setCurrentStep] = useState(0);

          const onboardingData = [
            {
              title: "Welcome to\\nBrill Prime",
              description: "Your trusted financial partner for secure transactions and seamless money management.",
              image: "/src/assets/images/onboarding_img1.png"
            },
            {
              title: "Secure\\nTransactions",
              description: "Bank-level security with end-to-end encryption for all your financial activities.",
              image: "/src/assets/images/onboarding_img2.png"
            },
            {
              title: "Smart Financial\\nManagement",
              description: "Track expenses, manage accounts, and make informed financial decisions.",
              image: "/src/assets/images/onboarding_img3.png"
            }
          ];

          const handleNext = () => {
            if (currentStep < onboardingData.length - 1) {
              setCurrentStep(currentStep + 1);
            } else {
              localStorage.setItem('hasSeenOnboarding', 'true');
              onComplete('role-selection');
            }
          };

          const currentData = onboardingData[currentStep];

          return (
            <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white p-6">
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-72 h-72 mb-8 flex items-center justify-center">
                  <img
                    src={currentData.image}
                    alt="Onboarding"
                    className="w-full h-full object-contain max-w-64 max-h-64"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <div className="w-64 h-64 bg-blue-100 rounded-lg flex items-center justify-center" style={{display: 'none'}}>
                    <span className="text-blue-600 text-6xl">📱</span>
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4 whitespace-pre-line">
                  {currentData.title}
                </h1>
                <p className="text-gray-600 text-center leading-relaxed">
                  {currentData.description}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center space-x-2">
                  {onboardingData.map((_, index) => (
                    <div
                      key={index}
                      className={\`w-2 h-2 rounded-full transition-colors \${
                        index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                      }\`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleNext}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  {currentStep === onboardingData.length - 1 ? 'Get Started' : 'Next'}
                  <span>→</span>
                </button>
              </div>
            </div>
          );
        }

        function RoleSelectionPage({ onComplete }) {
          const [selectedRole, setSelectedRole] = useState(null);

          const roles = [
            {
              id: 'CONSUMER',
              title: 'Consumer',
              description: 'Send money, pay bills, and manage your finances',
              icon: '👤'
            },
            {
              id: 'MERCHANT',
              title: 'Merchant',
              description: 'Accept payments and manage your business',
              icon: '🏪'
            },
            {
              id: 'DRIVER',
              title: 'Driver',
              description: 'Deliver orders and earn money on the go',
              icon: '🚗'
            }
          ];

          const handleContinue = () => {
            if (selectedRole) {
              localStorage.setItem('selectedRole', selectedRole);
              const isExistingUser = localStorage.getItem('isExistingUser');
              if (isExistingUser) {
                onComplete('signin');
              } else {
                onComplete('signup');
              }
            }
          };

          return (
            <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white p-6">
              <div className="text-center mb-8">
                <div className="w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <img
                    src="/src/assets/images/sign_up_option_logo.png"
                    alt="Logo"
                    className="w-full h-full object-contain max-w-20 max-h-20"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{display: 'none'}}>B</div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Role</h1>
                <p className="text-gray-600">Select how you'll be using Brill Prime</p>
              </div>

              <div className="space-y-4 flex-1">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={\`w-full p-4 border-2 rounded-lg bg-white cursor-pointer transition-all \${
                      selectedRole === role.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }\`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{role.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{role.title}</h3>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleContinue}
                disabled={!selectedRole}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                Continue
              </button>
            </div>
          );
        }

        function SignupPage({ onComplete }) {
          const [formData, setFormData] = useState({
            fullName: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            agreeToTerms: false
          });
          const [isLoading, setIsLoading] = useState(false);
          const [errors, setErrors] = useState({});

          const handleInputChange = (e) => {
            const { name, value, type, checked } = e.target;
            setFormData(prev => ({
              ...prev,
              [name]: type === 'checkbox' ? checked : value
            }));
            // Clear error for the field when user types
            if (errors[name]) {
              setErrors(prev => ({ ...prev, [name]: null }));
            }
          };

          const validateForm = () => {
            const newErrors = {};
            if (!formData.fullName) newErrors.fullName = 'Full Name is required';
            if (!formData.email) newErrors.email = 'Email is required';
            else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
            if (!formData.password) newErrors.password = 'Password is required';
            if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirm Password is required';
            if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
            if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms';
            return newErrors;
          };

          const handleSubmit = async (e) => {
            e.preventDefault();
            const formErrors = validateForm();
            if (Object.keys(formErrors).length > 0) {
              setErrors(formErrors);
              return;
            }

            setIsLoading(true);
            setErrors({}); // Clear previous errors

            try {
              const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fullName: formData.fullName,
                  email: formData.email,
                  phone: formData.phone,
                  password: formData.password,
                  role: localStorage.getItem('selectedRole') || 'CONSUMER',
                  agreeToTerms: formData.agreeToTerms
                })
              });

              const data = await response.json();

              if (!response.ok) {
                if (data.error) {
                  // Handle specific errors from backend
                  if (data.error.includes('User already exists')) {
                    setErrors({ email: data.error });
                  } else {
                    alert(`Signup failed: ${data.error}`);
                  }
                } else {
                  alert('Signup failed. Please try again.');
                }
                setIsLoading(false);
                return;
              }

              localStorage.setItem('userEmail', formData.email);
              localStorage.setItem('userPhone', formData.phone);
              setIsLoading(false);
              onComplete('otp-verification');

            } catch (error) {
              console.error('Signup API error:', error);
              alert('An unexpected error occurred. Please try again.');
              setIsLoading(false);
            }
          };

          return (
            <div className="min-h-screen max-w-md mx-auto bg-white p-6 flex flex-col">
              <div className="text-center mb-8">
                <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <img
                    src="/src/assets/images/logo.png"
                    alt="Brill Prime Logo"
                    className="w-full h-full object-contain max-w-16 max-h-16"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{display: 'none'}}>B</div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h1>
                <p className="text-gray-600">Join Brill Prime and start your financial journey</p>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.fullName ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    id="agreeToTerms"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-900">
                    I agree to the <a href="#" className="text-blue-600 font-medium hover:underline">Terms and Conditions</a>
                  </label>
                </div>
                {errors.agreeToTerms && <p className="text-red-500 text-sm mt-1">{errors.agreeToTerms}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              <div className="text-center mt-6">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => onComplete('signin')}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          );
        }

        function SigninPage({ onComplete }) {
          const [formData, setFormData] = useState({
            email: '',
            password: ''
          });
          const [isLoading, setIsLoading] = useState(false);
          const [errors, setErrors] = useState({});

          const handleInputChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({
              ...prev,
              [name]: value
            }));
            if (errors[name]) {
              setErrors(prev => ({ ...prev, [name]: null }));
            }
          };

          const validateForm = () => {
            const newErrors = {};
            if (!formData.email) newErrors.email = 'Email is required';
            else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
            if (!formData.password) newErrors.password = 'Password is required';
            return newErrors;
          };

          const handleSubmit = async (e) => {
            e.preventDefault();
            const formErrors = validateForm();
            if (Object.keys(formErrors).length > 0) {
              setErrors(formErrors);
              return;
            }

            setIsLoading(true);
            setErrors({});

            try {
              const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
              });

              const data = await response.json();

              if (!response.ok) {
                if (data.error) {
                  if (data.error === "Invalid credentials" || data.error === "Account is deactivated") {
                    setErrors({ _global: data.error });
                  } else {
                    alert(`Sign in failed: ${data.error}`);
                  }
                } else {
                  alert('Sign in failed. Please try again.');
                }
                setIsLoading(false);
                return;
              }

              localStorage.setItem('userEmail', formData.email);
              localStorage.setItem('isAuthenticated', 'true'); // This might be redundant if session is used
              setIsLoading(false);
              onComplete('dashboard');

            } catch (error) {
              console.error('Sign in API error:', error);
              alert('An unexpected error occurred. Please try again.');
              setIsLoading(false);
            }
          };

          return (
            <div className="min-h-screen max-w-md mx-auto bg-white p-6 flex flex-col justify-center">
              <div className="text-center mb-8">
                <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <img
                    src="/src/assets/images/logo.png"
                    alt="Brill Prime Logo"
                    className="w-full h-full object-contain max-w-16 max-h-16"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{display: 'none'}}>B</div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                <p className="text-gray-600">Sign in to your Brill Prime account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                {errors._global && <p className="text-red-500 text-center text-sm">{errors._global}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <div className="text-center mt-6">
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => onComplete('signup')}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </div>
          );
        }

        function OTPVerificationPage({ onComplete }) {
          const [otp, setOtp] = useState(['', '', '', '', '', '']);
          const [isLoading, setIsLoading] = useState(false);
          const [countdown, setCountdown] = useState(30);
          const [error, setError] = useState('');

          useEffect(() => {
            if (countdown > 0) {
              const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
              return () => clearTimeout(timer);
            }
          }, [countdown]);

          const handleOtpChange = (index, value) => {
            setError(''); // Clear error on input change
            if (value.length <= 1 && /^\d*$/.test(value)) { // Allow only digits
              const newOtp = [...otp];
              newOtp[index] = value;
              setOtp(newOtp);

              // Auto-focus next input
              if (value && index < 5) {
                const nextInput = document.getElementById(`otp-${index + 1}`);
                if (nextInput) nextInput.focus();
              }
              // Auto-focus previous input if backspace is pressed
              if (!value && index > 0) {
                const prevInput = document.getElementById(`otp-${index - 1}`);
                if (prevInput) prevInput.focus();
              }
            }
          };

          const handleKeyDown = (e, index) => {
            if (e.key === 'Backspace' && !otp[index] && index > 0) {
              const prevInput = document.getElementById(`otp-${index - 1}`);
              if (prevInput) prevInput.focus();
            }
          };

          const handleSubmit = async (e) => {
            e.preventDefault();
            const enteredOtp = otp.join('');
            if (enteredOtp.length !== 6) {
              setError('Please enter all 6 digits');
              return;
            }

            setIsLoading(true);
            setError('');

            // Simulate API call - replace with actual API call
            try {
              // const response = await fetch('/api/auth/verify-otp', {
              //   method: 'POST',
              //   headers: { 'Content-Type': 'application/json' },
              //   body: JSON.stringify({ email: localStorage.getItem('userEmail'), otp: enteredOtp })
              // });
              // const data = await response.json();

              // if (!response.ok) {
              //   setError(data.error || 'Invalid OTP');
              //   setIsLoading(false);
              //   return;
              // }

              // Simulate successful verification
              setTimeout(() => {
                localStorage.setItem('isAuthenticated', 'true');
                setIsLoading(false);
                onComplete('dashboard');
              }, 1500);

            } catch (error) {
              console.error('OTP Verification API error:', error);
              setError('An unexpected error occurred. Please try again.');
              setIsLoading(false);
            }
          };

          const resendOTP = () => {
            setCountdown(30);
            // Simulate resend API call
            alert('OTP resent successfully');
          };

          return (
            <div className="min-h-screen max-w-md mx-auto bg-white p-6 flex flex-col justify-center">
              <div className="text-center mb-8">
                <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-5xl">📱</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Phone</h1>
                <p className="text-gray-600">
                  Enter the 6-digit code sent to<br />
                  <span className="font-medium">{localStorage.getItem('userPhone') || '+234 XXX XXX XXXX'}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-center space-x-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className={`w-12 h-12 text-center border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold ${error ? 'border-red-500' : 'border-gray-300'}`}
                    />
                  ))}
                </div>

                {error && <p className="text-red-500 text-center text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Verifying...' : 'Verify'}
                </button>
              </form>

              <div className="text-center mt-6">
                {countdown > 0 ? (
                  <p className="text-gray-600">
                    Resend code in <span className="font-medium">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={resendOTP}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>
          );
        }

        function DashboardPage() {
          const [role, setRole] = useState(localStorage.getItem('selectedRole') || 'CONSUMER');
          const [userData, setUserData] = useState(null);
          const [stats, setStats] = useState(null);
          const [recentOrders, setRecentOrders] = useState([]);
          const [notifications, setNotifications] = useState([]);
          const [loading, setLoading] = useState(true);
          const [error, setError] = useState('');

          useEffect(() => {
            const fetchDashboardData = async () => {
              setLoading(true);
              setError('');
              try {
                const response = await fetch('/api/dashboard', {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token-based auth if not session
                  }
                });

                if (!response.ok) {
                  if (response.status === 401) {
                    // Handle unauthorized access, e.g., redirect to login
                    setError('Session expired or invalid. Please log in again.');
                    setTimeout(() => window.location.href = '/', 2000); // Redirect to home after delay
                    return;
                  }
                  throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setUserData(data.user);
                setRole(data.user.role); // Set role from fetched data
                setStats(data.stats);
                setRecentOrders(data.recentOrders);
                setNotifications(data.notifications);
              } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
                setError(err.message || 'Failed to load dashboard data.');
              } finally {
                setLoading(false);
              }
            };

            fetchDashboardData();
          }, []);

          const getDashboardTitle = () => {
            switch(role) {
              case 'CONSUMER': return 'Consumer Dashboard';
              case 'MERCHANT': return 'Merchant Dashboard';
              case 'DRIVER': return 'Driver Dashboard';
              default: return 'Dashboard';
            }
          };

          if (loading) return <div className="flex justify-center items-center min-h-screen"><p>Loading Dashboard...</p></div>;
          if (error) return <div className="flex justify-center items-center min-h-screen text-red-500"><p>{error}</p></div>;

          return (
            <div className="min-h-screen max-w-md mx-auto bg-gray-50 p-6">
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{getDashboardTitle()}</h1>
                <p className="text-gray-600 mb-6">Welcome, {userData?.fullName || 'User'}!</p>

                <div className="space-y-3 mb-6">
                  {role === 'CONSUMER' && (
                    <>
                      <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Send Money
                      </button>
                      <button className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors">
                        Pay Bills
                      </button>
                    </>
                  )}
                  {(role === 'MERCHANT' || role === 'CONSUMER') && (
                    <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors">
                      View Transactions
                    </button>
                  )}
                  {role === 'DRIVER' && (
                    <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors">
                      My Deliveries
                    </button>
                  )}
                </div>

                {stats && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-3">Your Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Total Orders</p>
                        <p className="text-xl font-bold text-blue-600">{stats.totalOrders}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Pending Orders</p>
                        <p className="text-xl font-bold text-orange-500">{stats.pendingOrders}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Completed Orders</p>
                        <p className="text-xl font-bold text-green-500">{stats.completedOrders}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Total Spent</p>
                        <p className="text-xl font-bold text-indigo-600">${stats.totalSpent.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {recentOrders.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-3">Recent Orders</h3>
                    <ul className="space-y-3">
                      {recentOrders.map((order) => (
                        <li key={order.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div>
                            <p className="font-medium text-gray-800">Order #{order.id}</p>
                            <p className="text-sm text-gray-500">{order.type} - {order.status}</p>
                          </div>
                          <span className="font-semibold text-gray-900">${order.amount.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {notifications.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-3">Notifications</h3>
                    <ul className="space-y-2">
                      {notifications.map((notif, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          <span className="font-medium">•</span> {notif.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
              <button onClick={() => { localStorage.removeItem('isAuthenticated'); window.location.href = '/'; }} className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors mt-4">Logout</button>
            </div>
          );
        }

        function App() {
          const [currentPage, setCurrentPage] = useState('splash');

          const renderPage = () => {
            switch(currentPage) {
              case 'splash':
                return <SplashPage onComplete={setCurrentPage} />;
              case 'onboarding':
                return <OnboardingPage onComplete={setCurrentPage} />;
              case 'role-selection':
                return <RoleSelectionPage onComplete={setCurrentPage} />;
              case 'signup':
                return <SignupPage onComplete={setCurrentPage} />;
              case 'signin':
                return <SigninPage onComplete={setCurrentPage} />;
              case 'otp-verification':
                return <OTPVerificationPage onComplete={setCurrentPage} />;
              case 'dashboard':
                return <DashboardPage />;
              default:
                return <SplashPage onComplete={setCurrentPage} />;
            }
          };

          return renderPage();
        }

        // Mount the app
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);

        console.log('Brill Prime script loaded');
    </script>
</body>
</html>
      `);
    });
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the stack trace for debugging

  // Determine status code, default to 500
  const statusCode = err.statusCode || err.status || 500;

  // Default error message
  let message = "Something went wrong on our end.";

  // More specific error messages based on type or status
  if (statusCode === 400) {
    message = "Bad Request: The server could not understand the request due to invalid syntax.";
  } else if (statusCode === 401) {
    message = "Unauthorized: Authentication is required and has failed or has not yet been provided.";
  } else if (statusCode === 403) {
    message = "Forbidden: You do not have permission to access this resource.";
  } else if (statusCode === 404) {
    message = "Not Found: The requested resource could not be found.";
  } else if (statusCode === 429) {
    message = "Too Many Requests: You have sent too many requests in a given amount of time.";
  }

  // If the error object has a specific message, use that
  if (err.message) {
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    // Optionally include the status code in the response
    status: statusCode
  });
});

// Function to initialize the application and database
async function initApp() {
  try {
    await initializeDatabase();
    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // Exit the process if the database cannot be initialized
    process.exit(1);
  }
}

// Start server with database initialization
initApp().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[${new Date().toLocaleTimeString()}] Brill Prime server running on port ${PORT}`);
    console.log("API endpoints available:");
    console.log("  - GET  /api/health");
    console.log("  - GET  /api/users");
    console.log("  - POST /api/auth/signup");
    console.log("  - POST /api/auth/signin");
    console.log("  - POST /api/auth/logout");
    console.log("  - GET  /api/auth/me");
    console.log("  - GET  /api/dashboard");
  });
});