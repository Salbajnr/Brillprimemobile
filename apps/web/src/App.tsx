import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, lazy } from "react";
import React from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { AsyncErrorBoundary } from "@/components/AsyncErrorBoundary";

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
    <ErrorBoundary>
      <Switch>
        <Route path="/" component={() => (
          <PageErrorBoundary pageName="Splash">
            <SplashPage />
          </PageErrorBoundary>
        )} />
        <Route path="/onboarding" component={() => (
          <PageErrorBoundary pageName="Onboarding">
            <OnboardingPage />
          </PageErrorBoundary>
        )} />
        <Route path="/role-selection" component={() => (
          <PageErrorBoundary pageName="Role Selection">
            <RoleSelectionPage />
          </PageErrorBoundary>
        )} />
        <Route path="/signup" component={() => (
          <PageErrorBoundary pageName="Sign Up">
            <SignupPage />
          </PageErrorBoundary>
        )} />
        <Route path="/signin" component={() => (
          <PageErrorBoundary pageName="Sign In">
            <SignInPage />
          </PageErrorBoundary>
        )} />
        <Route path="/forgot-password" component={() => (
          <PageErrorBoundary pageName="Forgot Password">
            <ForgotPasswordPage />
          </PageErrorBoundary>
        )} />
        <Route path="/reset-password/:token" component={() => (
          <PageErrorBoundary pageName="Reset Password">
            <ResetPasswordPage />
          </PageErrorBoundary>
        )} />
        <Route path="/otp-verification" component={() => (
          <PageErrorBoundary pageName="OTP Verification">
            <OtpVerificationPage />
          </PageErrorBoundary>
        )} />
        <Route path="/dashboard" component={() => (
          <PageErrorBoundary pageName="Dashboard">
            <AsyncErrorBoundary>
              <ProtectedRoute component={DashboardPage} />
            </AsyncErrorBoundary>
          </PageErrorBoundary>
        )} />
      <Route path="/consumer-home" component={() => (
        <PageErrorBoundary pageName="Consumer Home">
          <AsyncErrorBoundary>
            <ProtectedRoute component={ConsumerHomePage} />
          </AsyncErrorBoundary>
        </PageErrorBoundary>
      )} />
      <Route path="/merchant-dashboard" component={() => (
        <PageErrorBoundary pageName="Merchant Dashboard">
          <AsyncErrorBoundary>
            <ProtectedRoute component={lazy(() => import("./pages/merchant-dashboard-enhanced"))} />
          </AsyncErrorBoundary>
        </PageErrorBoundary>
      )} />
      <Route path="/merchant-dashboard-enhanced" component={() => (
        <PageErrorBoundary pageName="Merchant Dashboard">
          <AsyncErrorBoundary>
            <ProtectedRoute component={lazy(() => import("./pages/merchant-dashboard-enhanced"))} />
          </AsyncErrorBoundary>
        </PageErrorBoundary>
      )} />
      <Route path="/order-management" component={() => (
        <PageErrorBoundary pageName="Order Management">
          <AsyncErrorBoundary>
            {React.createElement(lazy(() => import("./pages/order-management")))}
          </AsyncErrorBoundary>
        </PageErrorBoundary>
      )} />
      <Route path="/driver-dashboard" component={() => (
        <PageErrorBoundary pageName="Driver Dashboard">
          <AsyncErrorBoundary>
            <ProtectedRoute component={lazy(() => import("./pages/driver-dashboard-enhanced"))} />
          </AsyncErrorBoundary>
        </PageErrorBoundary>
      )} />
      <Route path="/driver-dashboard-enhanced" component={() => (
        <PageErrorBoundary pageName="Driver Dashboard">
          <AsyncErrorBoundary>
            <ProtectedRoute component={lazy(() => import("./pages/driver-dashboard-enhanced"))} />
          </AsyncErrorBoundary>
        </PageErrorBoundary>
      )} />
      <Route path="/driver-withdrawal">
        {() => <ProtectedRoute component={DriverWithdrawal} />}
      </Route>
      <Route path="/delivery-detail">
        {() => <ProtectedRoute component={DeliveryDetail} />}
      </Route>
      <Route path="/driver-tier-selection" component={DriverTierSelection} />
      <Route path="/driver-registration">
        {() => <ProtectedRoute component={DriverRegistration} />}
      </Route>
      <Route path="/identity-verification">
        {() => <ProtectedRoute component={IdentityVerification} />}
      </Route>
      <Route path="/merchant-kyc" component={() => (
        <PageErrorBoundary pageName="Merchant KYC">
          <AsyncErrorBoundary>
            <ProtectedRoute component={lazy(() => import("./pages/merchant-kyc-verification"))} />
          </AsyncErrorBoundary>
        </PageErrorBoundary>
      )} />
      <Route path="/wallet/fund">
        {() => <ProtectedRoute component={WalletFundPage} />}
      </Route>
      <Route path="/fuel-ordering" component={() => <ProtectedRoute component={FuelOrderingPage} />} />
      <Route path="/fuel-order-details/:stationId" component={lazy(() => import("./pages/fuel-order-details"))} />
      <Route path="/order-confirmation/:orderId" component={lazy(() => import("./pages/order-confirmation"))} />
      <Route path="/track-order/:orderId" component={lazy(() => import("./pages/track-order"))} />
      <Route path="/qr-scanner" component={() => <ProtectedRoute component={QRScannerPage} />} />
      <Route path="/toll-payments" component={() => <ProtectedRoute component={TollPaymentsPage} />} />
      <Route path="/admin-control-center" component={lazy(() => import("./pages/admin-control-center"))} />
      <Route path="/admin-real-time" component={() => <ProtectedRoute component={lazy(() => import("./pages/admin-real-time-dashboard"))} />} />
      <Route path="/real-time-tracking" component={() => <ProtectedRoute component={lazy(() => import("./pages/real-time-tracking"))} />} />
      <Route path="/delivery-tracking" component={() => <ProtectedRoute component={lazy(() => import("./pages/real-time-tracking"))} />} />
      <Route path="/commodities">
        {() => <ProtectedRoute component={CommoditiesPage} />}
      </Route>
      <Route path="/vendor-feed">
        {() => <ProtectedRoute component={VendorFeedPage} />}
      </Route>
      <Route path="/chat">
        {() => <ProtectedRoute component={ChatPage} />}
      </Route>
      <Route path="/map-home">
        {() => <ProtectedRoute component={MapHomePage} />}
      </Route>
      <Route path="/location-setup">
        {() => <ProtectedRoute component={LocationSetupPage} />}
      </Route>
      <Route path="/side-menu">
        {() => <ProtectedRoute component={SideMenuPage} />}
      </Route>
      <Route path="/search-results">
        {() => <ProtectedRoute component={SearchResultsPage} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>
      <Route path="/edit-profile">
        {() => <ProtectedRoute component={EditProfilePage} />}
      </Route>
      <Route path="/account-settings">
        {() => <ProtectedRoute component={AccountSettingsPage} />}
      </Route>
      <Route path="/biometric-setup">
        {() => <ProtectedRoute component={BiometricSetupPage} />}
      </Route>
      <Route path="/payment-methods">
        {() => <ProtectedRoute component={PaymentMethodsPage} />}
      </Route>
      <Route path="/add-payment-method">
        {() => <ProtectedRoute component={AddPaymentMethodPage} />}
      </Route>
      <Route path="/cart">
        {() => <ProtectedRoute component={CartPage} />}
      </Route>
      <Route path="/checkout" component={() => <ProtectedRoute component={lazy(() => import("./pages/checkout"))} />} />
      <Route path="/order-history">
        {() => <ProtectedRoute component={OrderHistory} />}
      </Route>
      <Route path="/order-history-detail">
        {() => <ProtectedRoute component={OrderHistoryDetail} />}
      </Route>
      <Route path="/notifications">
        {() => <ProtectedRoute component={NotificationsPage} />}
      </Route>
      <Route path="/merchants">
        {() => <ProtectedRoute component={MerchantsPage} />}
      </Route>
      <Route path="/support" component={Support} />
      <Route path="/account-settings" component={AccountSettingsPage} />
      <Route path="/toll-payment-success" component={lazy(() => import("./pages/toll-payment-success"))} />
      <Route component={() => (
        <PageErrorBoundary pageName="Not Found">
          <NotFound />
        </PageErrorBoundary>
      )} />
    </Switch>
    </ErrorBoundary>
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AsyncErrorBoundary>
            <Router />
          </AsyncErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;