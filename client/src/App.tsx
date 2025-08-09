import React, { useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Splash Screen Component
function SplashPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if user has seen onboarding before
      const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
      if (hasSeenOnboarding) {
        // Returning user → Role Selection
        setLocation("/role-selection");
      } else {
        // First-time user → Onboarding
        setLocation("/onboarding");
      }
    }, 3000); // Show splash for 3 seconds

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Logo with effects */}
      <div className="flex flex-col items-center justify-center">
        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
          <div className="text-white text-4xl sm:text-6xl font-bold">B</div>
        </div>
        
        <div className="mt-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Brillprime</h1>
          <p className="text-gray-600 mt-2 text-sm">Financial Solutions</p>
        </div>
        
        {/* Loading animation */}
        <div className="mt-8 flex space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

// Onboarding Page
function OnboardingPage() {
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setLocation("/role-selection");
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <div className="text-white text-3xl font-bold">B</div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Brillprime</h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Your trusted financial partner for secure transactions and seamless money management in Nigeria.
        </p>
      </div>
      
      <div className="space-y-4 mb-8 text-center">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Smart Financial Management</h3>
          <p className="text-gray-600 text-sm">Track expenses and manage accounts with advanced analytics</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Bank-Level Security</h3>
          <p className="text-gray-600 text-sm">End-to-end encryption and biometric authentication</p>
        </div>
      </div>
      
      <button
        onClick={handleGetStarted}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        data-testid="button-get-started"
      >
        Get Started
      </button>
    </div>
  );
}

// Role Selection Page
function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<'CONSUMER' | 'MERCHANT' | 'DRIVER' | null>(null);
  const [, setLocation] = useLocation();

  const handleContinue = () => {
    if (selectedRole) {
      localStorage.setItem("selectedRole", selectedRole);
      setLocation("/dashboard");
    }
  };

  const roles = [
    { 
      id: 'CONSUMER', 
      title: 'Consumer', 
      description: 'Send money, pay bills, and manage finances',
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
      description: 'Deliver orders and earn money',
      icon: '🚗'
    }
  ];

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-center p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <div className="text-white text-xl font-bold">B</div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Choose Your Role</h1>
        <p className="text-gray-600 text-sm">Select how you'll be using Brillprime</p>
      </div>

      <div className="space-y-4 mb-8">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role.id as any)}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              selectedRole === role.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            data-testid={`button-role-${role.id.toLowerCase()}`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{role.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{role.title}</h3>
                <p className="text-gray-600 text-sm">{role.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selectedRole}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="button-continue"
      >
        Continue
      </button>
    </div>
  );
}

// Dashboard Page (simplified)
function DashboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const selectedRole = localStorage.getItem("selectedRole");

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {selectedRole === 'CONSUMER' && 'Consumer Portal'}
          {selectedRole === 'MERCHANT' && 'Merchant Dashboard'}
          {selectedRole === 'DRIVER' && 'Driver Hub'}
          {!selectedRole && 'Dashboard'}
        </h1>
        <p className="text-gray-600 mb-6">Welcome to Brillprime Financial Solutions</p>
        
        <div className="space-y-3 mb-6">
          <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors" data-testid="button-send-money">
            Send Money
          </button>
          <button className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors" data-testid="button-pay-bills">
            Pay Bills
          </button>
          <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors" data-testid="button-view-transactions">
            View Transactions
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">System Status</h3>
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : (
            <p className="text-green-600">API Connected - {users.length} users loaded</p>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/" component={SplashPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/role-selection" component={RoleSelectionPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route>
            <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
              <p className="text-gray-600">The page you're looking for doesn't exist.</p>
            </div>
          </Route>
        </Switch>
      </div>
    </QueryClientProvider>
  );
}

export default App;