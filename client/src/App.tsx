import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, lazy, Suspense } from "react";

// Core pages loaded immediately
import SplashPage from "@/pages/splash";
import NotFound from "@/pages/not-found";

// Lazy load other pages to prevent module conflicts
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const RoleSelectionPage = lazy(() => import("@/pages/role-selection"));
const SignupPage = lazy(() => import("@/pages/signup"));
const SignInPage = lazy(() => import("@/pages/signin"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const OtpVerificationPage = lazy(() => import("@/pages/otp-verification"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const EditProfilePage = lazy(() => import("@/pages/edit-profile"));
const AccountSettingsPage = lazy(() => import("@/pages/account-settings"));
const BiometricSetupPage = lazy(() => import("@/pages/biometric-setup"));

// Additional pages that exist
const TollPaymentsPage = lazy(() => import("@/pages/toll-payments"));
const PaymentMethodsPage = lazy(() => import("@/pages/payment-methods"));
const AddPaymentMethodPage = lazy(() => import("@/pages/add-payment-method"));
const ConsumerHomePage = lazy(() => import("@/pages/consumer-home"));
const MerchantDashboard = lazy(() => import("@/pages/merchant-dashboard"));
const DriverDashboard = lazy(() => import("@/pages/driver-dashboard"));

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated()) {
    return <Suspense fallback={<div>Loading...</div>}><SignInPage /></Suspense>;
  }

  return <Suspense fallback={<div>Loading...</div>}><Component /></Suspense>;
}

function Router() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <Switch>
        <Route path="/" component={SplashPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/role-selection" component={RoleSelectionPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/signin" component={SignInPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password/:token" component={ResetPasswordPage} />
        <Route path="/otp-verification" component={OtpVerificationPage} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
        <Route path="/consumer-home" component={() => <ProtectedRoute component={ConsumerHomePage} />} />
        <Route path="/merchant-dashboard" component={() => <ProtectedRoute component={MerchantDashboard} />} />
        <Route path="/driver-dashboard" component={() => <ProtectedRoute component={DriverDashboard} />} />
        <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
        <Route path="/edit-profile" component={() => <ProtectedRoute component={EditProfilePage} />} />
        <Route path="/account-settings" component={() => <ProtectedRoute component={AccountSettingsPage} />} />
        <Route path="/biometric-setup" component={() => <ProtectedRoute component={BiometricSetupPage} />} />
        <Route path="/payment-methods" component={() => <ProtectedRoute component={PaymentMethodsPage} />} />
        <Route path="/add-payment-method" component={() => <ProtectedRoute component={AddPaymentMethodPage} />} />
        <Route path="/toll-payments" component={() => <ProtectedRoute component={TollPaymentsPage} />} />
        
        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const { user } = useAuth();

  // Initialize the app state on load
  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (user && (window.location.pathname === "/" || window.location.pathname === "/onboarding")) {
      window.location.pathname = "/dashboard";
    }
  }, [user]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;