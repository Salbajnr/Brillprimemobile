import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

import SplashPage from "@/pages/splash";
import OnboardingPage from "@/pages/onboarding";
import RoleSelectionPage from "@/pages/role-selection";
import SignupPage from "@/pages/signup";
import SignInPage from "@/pages/signin";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import OtpVerificationPage from "@/pages/otp-verification";
import DashboardPage from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import EditProfilePage from "@/pages/edit-profile";
import AccountSettingsPage from "@/pages/account-settings";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated()) {
    return <SignInPage />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/role-selection" component={RoleSelectionPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/signin" component={SignInPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route path="/otp-verification" component={OtpVerificationPage} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
      <Route path="/edit-profile" component={() => <ProtectedRoute component={EditProfilePage} />} />
      <Route path="/account-settings" component={() => <ProtectedRoute component={AccountSettingsPage} />} />
      <Route component={NotFound} />
    </Switch>
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
