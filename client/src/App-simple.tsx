import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Import only essential pages directly to avoid circular dependencies
import SplashPage from "@/pages/splash";
import OnboardingPage from "@/pages/onboarding";
import RoleSelectionPage from "@/pages/role-selection";
import SignupPage from "@/pages/signup";
import SignInPage from "@/pages/signin";
import DashboardPage from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/" component={SplashPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/role-selection" component={RoleSelectionPage} />
          <Route path="/signup" component={SignupPage} />
          <Route path="/signin" component={SignInPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route component={NotFound} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;