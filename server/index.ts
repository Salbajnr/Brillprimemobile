import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

// Basic API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/users", (req, res) => {
  res.json([
    { id: "1", name: "Test User", role: "CONSUMER" },
    { id: "2", name: "Test Merchant", role: "MERCHANT" }
  ]);
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
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
    <title>Brillprime - Financial Solutions</title>
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
            console.log('Brillprime app initializing...');
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
              <div className="w-48 h-48 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <img src="/src/assets/images/logo.png" alt="Brillprime Logo" className="w-32 h-32 object-contain" onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }} />
                <div className="text-white text-6xl font-bold" style={{display: 'none'}}>B</div>
              </div>
              <div className="mt-6 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Brillprime</h1>
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
              title: "Welcome to\\nBrillprime",
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
                <div className="w-64 h-64 mb-8">
                  <img 
                    src={currentData.image} 
                    alt="Onboarding" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <div className="w-full h-full bg-blue-100 rounded-lg flex items-center justify-center" style={{display: 'none'}}>
                    <span className="text-blue-600 text-4xl">📱</span>
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
              onComplete('dashboard');
            }
          };

          return (
            <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white p-6">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <img 
                    src="/src/assets/images/sign_up_option_logo.png" 
                    alt="Logo" 
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <div className="text-white text-2xl font-bold" style={{display: 'none'}}>B</div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Role</h1>
                <p className="text-gray-600">Select how you'll be using Brillprime</p>
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
                <p className="text-gray-600 mb-6">Welcome to Brillprime Financial Solutions</p>
                
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
        
        console.log('Brillprime script loaded');
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
  console.log(`[${new Date().toLocaleTimeString()}] Brillprime server running on port ${port}`);
  console.log(`API endpoints: /api/health, /api/users`);
});
