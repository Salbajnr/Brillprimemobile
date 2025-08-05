import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, lazy } from "react";

import SplashPage from "@/pages/splash";
import OnboardingPage from "@/pages/onboarding";
import RoleSelectionPage from "@/pages/role-selection";
import SignupPage from "@/pages/signup";
import SignInPage from "@/pages/signin";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import OtpVerificationPage from "@/pages/otp-verification";
import DashboardPage from "@/pages/dashboard";
import ConsumerHomePage from "@/pages/consumer-home";
import WalletFundPage from "@/pages/wallet-fund";
import FuelOrderingPage from "@/pages/fuel-ordering";
import QRScannerPage from "@/pages/qr-scanner";
import TollPaymentsPage from "@/pages/toll-payments";
import CommoditiesPage from "@/pages/commodities";
import VendorFeedPage from "@/pages/vendor-feed";
import ChatPage from "@/pages/chat";
import MapHomePage from "@/pages/map-home";
import LocationSetupPage from "@/pages/location-setup";
import SideMenuPage from "@/pages/side-menu";
import SearchResultsPage from "@/pages/search-results";
import ProfilePage from "@/pages/profile";
import EditProfilePage from "@/pages/edit-profile";
import AccountSettingsPage from "@/pages/account-settings";
import BiometricSetupPage from "@/pages/biometric-setup";
import PaymentMethodsPage from "@/pages/payment-methods";
import AddPaymentMethodPage from "@/pages/add-payment-method";
import CartPage from "@/pages/cart";
import NotificationsPage from "@/pages/notifications";
import MerchantsPage from "@/pages/merchants";
import NotFound from "@/pages/not-found";
import MerchantDashboard from "@/pages/merchant-dashboard";
import DriverDashboard from "@/pages/driver-dashboard";
import DriverTierSelection from "@/pages/driver-tier-selection";
import DriverRegistration from "@/pages/driver-registration";
import DeliveryDetail from "@/pages/delivery-detail";
import DriverWithdrawal from "@/pages/driver-withdrawal";
import OrderHistory from "@/pages/order-history";
import OrderHistoryDetail from "@/pages/order-history-detail";
import Support from "@/pages/support";
import Messages from "@/pages/messages";
import IdentityVerification from "@/pages/identity-verification-simple";
import TollPayments from "./pages/toll-payments";
import FuelDeliveryTracking from "./pages/fuel-delivery-tracking";
import AdminDashboard from "@/pages/admin-dashboard";

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
      <Route path="/consumer-home" component={() => <ProtectedRoute component={ConsumerHomePage} />} />
      <Route path="/merchant-dashboard" component={() => <ProtectedRoute component={MerchantDashboard} />} />
      <Route path="/order-management" component={lazy(() => import("./pages/order-management"))} />
      <Route path="/driver-dashboard" component={() => <ProtectedRoute component={DriverDashboard} />} />
      <Route path="/driver-withdrawal" component={() => <ProtectedRoute component={DriverWithdrawal} />} />
      <Route path="/delivery-detail" component={() => <ProtectedRoute component={DeliveryDetail} />} />
      <Route path="/driver-tier-selection" component={DriverTierSelection} />
      <Route path="/driver-registration" component={() => <ProtectedRoute component={DriverRegistration} />} />
      <Route path="/identity-verification" component={() => <ProtectedRoute component={IdentityVerification} />} />
      <Route path="/wallet/fund" component={() => <ProtectedRoute component={WalletFundPage} />} />
      <Route path="/fuel-ordering" component={() => <ProtectedRoute component={FuelOrderingPage} />} />
      <Route path="/fuel-order-details/:stationId" component={lazy(() => import("./pages/fuel-order-details"))} />
      <Route path="/order-confirmation/:orderId" component={lazy(() => import("./pages/order-confirmation"))} />
      <Route path="/track-order/:orderId" component={lazy(() => import("./pages/track-order"))} />
      <Route path="/qr-scanner" component={() => <ProtectedRoute component={QRScannerPage} />} />
      <Route path="/toll-payments" component={() => <ProtectedRoute component={TollPaymentsPage} />} />
      <Route path="/commodities" component={() => <ProtectedRoute component={CommoditiesPage} />} />
      <Route path="/vendor-feed" component={() => <ProtectedRoute component={VendorFeedPage} />} />
      <Route path="/chat" component={() => <ProtectedRoute component={ChatPage} />} />
      <Route path="/map-home" component={() => <ProtectedRoute component={MapHomePage} />} />
      <Route path="/location-setup" component={() => <ProtectedRoute component={LocationSetupPage} />} />
      <Route path="/side-menu" component={() => <ProtectedRoute component={SideMenuPage} />} />
      <Route path="/search-results" component={() => <ProtectedRoute component={SearchResultsPage} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
      <Route path="/edit-profile" component={() => <ProtectedRoute component={EditProfilePage} />} />
      <Route path="/account-settings" component={() => <ProtectedRoute component={AccountSettingsPage} />} />
      <Route path="/biometric-setup" component={() => <ProtectedRoute component={BiometricSetupPage} />} />
      <Route path="/payment-methods" component={() => <ProtectedRoute component={PaymentMethodsPage} />} />
      <Route path="/add-payment-method" component={() => <ProtectedRoute component={AddPaymentMethodPage} />} />
      <Route path="/cart" component={() => <ProtectedRoute component={CartPage} />} />
      <Route path="/order-history" component={() => <ProtectedRoute component={OrderHistory} />} />
      <Route path="/order-history-detail" component={() => <ProtectedRoute component={OrderHistoryDetail} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
      <Route path="/merchants" component={() => <ProtectedRoute component={MerchantsPage} />} />
      <Route path="/support" component={Support} />
      <Route path="/account-settings" component={AccountSettingsPage} />
      <Route path="/toll-payment-success" component={() => import("./pages/toll-payment-success")} />
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