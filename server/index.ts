import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { setupWebSocket } from "./websocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Setup WebSocket
setupWebSocket(server);

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

// Import and register all route modules
import adminRoutes from "./admin/routes.js";
import merchantRoutes from "./routes/merchant.js";
import driverRoutes from "./routes/driver.js";
import tollPaymentsRoutes from "./routes/toll-payments.js";
import verificationRoutes from "./routes/verification.js";


// Register route modules with proper prefixes
app.use("/api/admin", adminRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/toll", tollPaymentsRoutes);
app.use("/api/verification", verificationRoutes);


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
            confirmPassword: ''
          });
          const [isLoading, setIsLoading] = useState(false);

          const handleInputChange = (e) => {
            setFormData({
              ...formData,
              [e.target.name]: e.target.value
            });
          };

          const handleSubmit = async (e) => {
            e.preventDefault();
            if (formData.password !== formData.confirmPassword) {
              alert('Passwords do not match');
              return;
            }
            
            setIsLoading(true);
            // Simulate API call
            setTimeout(() => {
              localStorage.setItem('userEmail', formData.email);
              localStorage.setItem('userPhone', formData.phone);
              setIsLoading(false);
              onComplete('otp-verification');
            }, 1500);
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
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

          const handleInputChange = (e) => {
            setFormData({
              ...formData,
              [e.target.name]: e.target.value
            });
          };

          const handleSubmit = async (e) => {
            e.preventDefault();
            setIsLoading(true);
            
            // Simulate API call
            setTimeout(() => {
              localStorage.setItem('userEmail', formData.email);
              localStorage.setItem('isAuthenticated', 'true');
              setIsLoading(false);
              onComplete('dashboard');
            }, 1500);
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
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

          useEffect(() => {
            if (countdown > 0) {
              const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
              return () => clearTimeout(timer);
            }
          }, [countdown]);

          const handleOtpChange = (index, value) => {
            if (value.length <= 1) {
              const newOtp = [...otp];
              newOtp[index] = value;
              setOtp(newOtp);
              
              // Auto-focus next input
              if (value && index < 5) {
                const nextInput = document.getElementById(`otp-${index + 1}`);
                if (nextInput) nextInput.focus();
              }
            }
          };

          const handleSubmit = async (e) => {
            e.preventDefault();
            if (otp.join('').length !== 6) {
              alert('Please enter all 6 digits');
              return;
            }
            
            setIsLoading(true);
            // Simulate API call
            setTimeout(() => {
              localStorage.setItem('isAuthenticated', 'true');
              setIsLoading(false);
              onComplete('dashboard');
            }, 1500);
          };

          const resendOTP = () => {
            setCountdown(30);
            // Simulate resend
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
                      className="w-12 h-12 text-center border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                    />
                  ))}
                </div>
                
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

          const getDashboardTitle = () => {
            switch(role) {
              case 'CONSUMER': return 'Consumer Dashboard';
              case 'MERCHANT': return 'Merchant Dashboard';
              case 'DRIVER': return 'Driver Dashboard';
              default: return 'Dashboard';
            }
          };

          return (
            <div className="min-h-screen max-w-md mx-auto bg-gray-50 p-6">
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{getDashboardTitle()}</h1>
                <p className="text-gray-600 mb-6">Welcome to Brill Prime Financial Solutions</p>
                
                <div className="space-y-3 mb-6">
                  <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Send Money
                  </button>
                  <button className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors">
                    Pay Bills
                  </button>
                  <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors">
                    View Transactions
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">System Status</h3>
                  <p className="text-green-600">All systems operational ✓</p>
                </div>
              </div>
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
app.use((err: any, req: any, res: any, next: any) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Start server - Replit expects port 5000 for workflows
const port = 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`[${new Date().toLocaleTimeString()}] Brill Prime server running on port ${port}`);
  console.log(`API endpoints: /api/health, /api/users`);
});