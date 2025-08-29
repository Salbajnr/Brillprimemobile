import { Router, Route } from 'wouter';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './hooks/use-auth';
import React, { Suspense } from 'react';

// Lazy load pages for better performance
const Splash = React.lazy(() => import('./pages/splash'));
const Onboarding = React.lazy(() => import('./pages/onboarding'));
const RoleSelection = React.lazy(() => import('./pages/role-selection'));
const SignUp = React.lazy(() => import('./pages/signup'));
const SignIn = React.lazy(() => import('./pages/signin'));
const ConsumerHome = React.lazy(() => import('./pages/consumer-home'));
const MerchantDashboard = React.lazy(() => import('./pages/merchant-dashboard'));
const DriverDashboard = React.lazy(() => import('./pages/driver-dashboard'));
const AdminDashboard = React.lazy(() => import('./pages/admin-dashboard'));
const OtpVerification = React.lazy(() => import('./pages/otp-verification'));
const NotFound = React.lazy(() => import('./pages/not-found'));
const AdminSupport = React.lazy(() => import('./pages/admin-support'));
const Support = React.lazy(() => import('./pages/support'));
const SystemHealthDashboard = React.lazy(() => import('./pages/system-health-dashboard'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Suspense fallback={<PageLoader />}>
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
            <Route path="/admin-support" component={AdminSupport} />
            <Route path="/support" component={Support} />
            <Route path="/system-health-dashboard" component={SystemHealthDashboard} />
            <Route component={NotFound} />
          </Suspense>
        </div>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;