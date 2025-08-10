import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth-simple";

// Import only essential pages directly to avoid circular dependencies
import SplashPage from "@/pages/splash";
import OnboardingPage from "@/pages/onboarding";
import RoleSelectionPage from "@/pages/role-selection";
import SignupPage from "@/pages/signup";
import SignInPage from "@/pages/signin";
import DashboardPage from "@/pages/dashboard";
import MerchantsPage from "@/pages/merchants";
import FuelOrderingPage from "@/pages/fuel-ordering";
import SearchResultsPage from "@/pages/search-results";
import ConsumerHomePage from "@/pages/consumer-home";
import OrderHistoryPage from "@/pages/order-history";
import ProfilePage from "@/pages/profile";
import NotificationsPage from "@/pages/notifications";
import RealTimeTrackingPage from "@/pages/real-time-tracking";
import NotFound from "@/pages/not-found";
import WalletFund from "./pages/wallet-fund";
import WalletFundCallback from "./pages/wallet-fund-callback";
import WalletTransactions from "./pages/wallet-transactions";
import WalletBalance from "./pages/wallet-balance";
import BillsPayment from "./pages/bills-payment";
import MoneyTransfer from "./pages/money-transfer";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background font-sans antialiased">
            <Switch>
              <Route path="/" component={SplashPage} />
              <Route path="/onboarding" component={OnboardingPage} />
              <Route path="/role-selection" component={RoleSelectionPage} />
              <Route path="/signup" component={SignupPage} />
              <Route path="/signin" component={SignInPage} />
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/consumer-home" component={ConsumerHomePage} />
              <Route path="/merchants" component={MerchantsPage} />
              <Route path="/fuel-ordering" component={FuelOrderingPage} />
              <Route path="/search-results" component={SearchResultsPage} />
              <Route path="/order-history" component={OrderHistoryPage} />
              <Route path="/profile" component={ProfilePage} />
              <Route path="/notifications" component={NotificationsPage} />
              <Route path="/real-time-tracking" component={RealTimeTrackingPage} />
              <Route path="/wallet-fund" component={WalletFund} />
              <Route path="/wallet-fund/callback" component={WalletFundCallback} />
              <Route path="/wallet/transactions" component={WalletTransactions} />
              <Route path="/wallet" component={WalletBalance} />
              <Route path="/bills" component={BillsPayment} />
              <Route path="/transfer" component={MoneyTransfer} />
              <Route component={NotFound} />
            </Switch>
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;