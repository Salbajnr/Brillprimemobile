import { Route, Switch } from 'wouter';

// Import the existing sophisticated pages
import SplashPage from './pages/splash';
import OnboardingPage from './pages/onboarding';
import RoleSelectionPage from './pages/role-selection';
import ConsumerHome from './pages/consumer-home';
import MerchantDashboard from './pages/merchant-dashboard';
import DriverDashboard from './pages/driver-dashboard';
import Dashboard from './pages/dashboard';
import NotFoundPage from './pages/not-found';

function App() {
  return (
    <div className="min-h-screen">
      <Switch>
        <Route path="/" component={SplashPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/role-selection" component={RoleSelectionPage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/consumer-home" component={ConsumerHome} />
        <Route path="/merchant-dashboard" component={MerchantDashboard} />
        <Route path="/driver-dashboard" component={DriverDashboard} />
        <Route path="/404" component={NotFoundPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </div>
  );
}

export default App;