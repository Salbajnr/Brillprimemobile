import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './hooks/use-auth';

// Import pages
import Splash from './pages/splash';
import Onboarding from './pages/onboarding';
import RoleSelection from './pages/role-selection';
import SignUp from './pages/signup';
import SignIn from './pages/signin';
import MerchantDashboard from './pages/merchant-dashboard';
import DriverDashboard from './pages/driver-dashboard';
import AdminDashboard from './pages/admin-dashboard';
import OtpVerification from './pages/otp-verification';
import NotFound from './pages/not-found';
import AdminSupport from './pages/admin-support';
import Support from './pages/support';
import SystemHealthDashboard from './pages/system-health-dashboard';

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-white">
            <Switch>
              <Route path="/" component={Splash} />
              <Route path="/onboarding" component={Onboarding} />
              <Route path="/role-selection" component={RoleSelection} />
              <Route path="/signup" component={SignUp} />
              <Route path="/signin" component={SignIn} />
              <Route path="/otp-verification" component={OtpVerification} />
              <Route path="/merchant-dashboard" component={MerchantDashboard} />
              <Route path="/driver-dashboard" component={DriverDashboard} />
              <Route path="/admin-dashboard" component={AdminDashboard} />
              <Route path="/admin-support" element={<AdminSupport />} />
              <Route path="/support" element={<Support />} />
              <Route path="/system-health-dashboard" element={<SystemHealthDashboard />} />
              <Route component={NotFound} />
            </Switch>
          </div>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;