
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-white">
            <Switch>
              <Route path="/" component={Splash} />
              <Route path="/signin" component={SignIn} />
              <Route path="/role-selection" component={RoleSelection} />
              <Route path="/onboarding" component={Onboarding} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/consumer-home" component={ConsumerHome} />
              <Route path="/merchant-dashboard" component={MerchantDashboard} />
              <Route path="/driver-dashboard" component={DriverDashboard} />
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
