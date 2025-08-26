import { Router, Route, Switch } from 'wouter';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './hooks/use-auth';

// Import pages
import Splash from './pages/splash';
import Onboarding from './pages/onboarding';
import RoleSelection from './pages/role-selection';
import SignUp from './pages/signup';
import SignIn from './pages/signin';
import ConsumerHome from './pages/consumer-home';
import MerchantDashboard from './pages/merchant-dashboard';
import DriverDashboard from './pages/driver-dashboard';
import AdminDashboard from './pages/admin-dashboard';
import OtpVerification from './pages/otp-verification';
import NotFound from './pages/not-found';
import AdminSupport from './pages/admin-support';
import Support from './pages/support';
import SystemHealthDashboard from './pages/system-health-dashboard';

function App() {
  return (
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
            <Route path="/consumer-home" component={ConsumerHome} />
            <Route path="/merchant-dashboard" component={MerchantDashboard} />
            <Route path="/driver-dashboard" component={DriverDashboard} />
            <Route path="/admin-dashboard" component={AdminDashboard} />
            <Route path="/admin-support" component={() => <AdminSupport />} />
            <Route path="/support" component={() => <Support />} />
            <Route path="/system-health-dashboard" component={() => <SystemHealthDashboard />} />
            <Route component={NotFound} />
          </Switch>
        </div>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;