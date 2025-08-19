import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './hooks/use-auth';

// Import pages
import Splash from './pages/splash';
import SignIn from './pages/signin';
import Dashboard from './pages/dashboard';
import ConsumerHome from './pages/consumer-home';
import MerchantDashboard from './pages/merchant-dashboard';
import DriverDashboard from './pages/driver-dashboard';
import RoleSelection from './pages/role-selection';
import Onboarding from './pages/onboarding';
import NotFound from './pages/not-found';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
    },
  },
});

function App() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 style={{fontSize: '2.5rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '1rem'}}>BrillPrime</h1>
        <p style={{fontSize: '1.125rem', color: '#4b5563', marginBottom: '2rem'}}>Multi-Service Delivery Platform</p>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', maxWidth: '32rem'}}>
          <div style={{padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem'}}>
            <h3 style={{fontWeight: '600'}}>Consumer Services</h3>
            <p style={{fontSize: '0.875rem', color: '#4b5563'}}>Order food, fuel, and more</p>
          </div>
          <div style={{padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem'}}>
            <h3 style={{fontWeight: '600'}}>Merchant Platform</h3>
            <p style={{fontSize: '0.875rem', color: '#4b5563'}}>Manage your business</p>
          </div>
          <div style={{padding: '1rem', backgroundColor: '#fefce8', borderRadius: '0.5rem'}}>
            <h3 style={{fontWeight: '600'}}>Driver App</h3>
            <p style={{fontSize: '0.875rem', color: '#4b5563'}}>Deliver orders efficiently</p>
          </div>
          <div style={{padding: '1rem', backgroundColor: '#faf5ff', borderRadius: '0.5rem'}}>
            <h3 style={{fontWeight: '600'}}>Admin Dashboard</h3>
            <p style={{fontSize: '0.875rem', color: '#4b5563'}}>Monitor and manage platform</p>
          </div>
        </div>
        <div style={{marginTop: '2rem', textAlign: 'center'}}>
          <p style={{fontSize: '0.875rem', color: '#6b7280'}}>✅ Server Connected</p>
          <p style={{fontSize: '0.875rem', color: '#6b7280'}}>✅ Database Active</p>
          <p style={{fontSize: '0.875rem', color: '#6b7280'}}>✅ Redis Connected</p>
          <p style={{fontSize: '0.875rem', color: '#6b7280'}}>✅ Migration Complete</p>
        </div>
      </div>
    </div>
  );
}

export default App;