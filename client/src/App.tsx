import React from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import { NotificationSystem } from './components/ui/notification-system';

// Import all pages
import SplashPage from './pages/splash';
import OnboardingPage from './pages/onboarding';
import RoleSelectionPage from './pages/role-selection';
import SignupPage from './pages/signup';
import SigninPage from './pages/signin';
import OtpVerificationPage from './pages/otp-verification';
import DriverTierSelectionPage from './pages/driver-tier-selection';
import DriverRegistrationPage from './pages/driver-registration';
import LocationSetupPage from './pages/location-setup';
import IdentityVerificationPage from './pages/identity-verification';
import EnhancedVerificationPage from './pages/enhanced-verification';
import MfaSetupPage from './pages/mfa-setup';
import BiometricSetupPage from './pages/biometric-setup';
import ForgotPasswordPage from './pages/forgot-password';
import ResetPasswordPage from './pages/reset-password';

// Dashboard Pages
import DashboardPage from './pages/dashboard';
import ConsumerHomePage from './pages/consumer-home';
import DriverDashboardPage from './pages/driver-dashboard';
import DriverDashboardEnhancedPage from './pages/driver-dashboard-enhanced';
import MerchantDashboardPage from './pages/merchant-dashboard';
import MerchantDashboardEnhancedPage from './pages/merchant-dashboard-enhanced';

// Feature Pages
import MapHomePage from './pages/map-home';
import CommoditiesPage from './pages/commodities';
import MerchantsPage from './pages/merchants';
import CartPage from './pages/cart';
import CheckoutPage from './pages/checkout';
import OrderConfirmationPage from './pages/order-confirmation';
import TrackOrderPage from './pages/track-order';
import OrderHistoryPage from './pages/order-history';
import OrderHistoryDetailPage from './pages/order-history-detail';
import RealTimeTrackingPage from './pages/real-time-tracking';
import DeliveryDetailPage from './pages/delivery-detail';

// Fuel Services
import FuelOrderingPage from './pages/fuel-ordering';
import FuelOrderDetailsPage from './pages/fuel-order-details';
import FuelDeliveryTrackingPage from './pages/fuel-delivery-tracking';

// Toll Services
import TollPaymentsPage from './pages/toll-payments';
import TollPaymentsEnhancedPage from './pages/toll-payments-enhanced';
import TollPaymentSuccessPage from './pages/toll-payment-success';
import QRScannerPage from './pages/qr-scanner';

// Wallet & Payments
import WalletBalancePage from './pages/wallet-balance';
import WalletFundPage from './pages/wallet-fund';
import WalletFundCallbackPage from './pages/wallet-fund-callback';
import WalletTransactionsPage from './pages/wallet-transactions';
import PaymentMethodsPage from './pages/payment-methods';
import AddPaymentMethodPage from './pages/add-payment-method';
import MoneyTransferPage from './pages/money-transfer';
import BillsPaymentPage from './pages/bills-payment';
import DriverWithdrawalPage from './pages/driver-withdrawal';

// Account & Profile
import ProfilePage from './pages/profile';
import EditProfilePage from './pages/edit-profile';
import AccountSettingsPage from './pages/account-settings';
import NotificationsPage from './pages/notifications';
import MessagesPage from './pages/messages';
import ChatPage from './pages/chat';

// Support & Help
import SupportPage from './pages/support';
import SupportTicketSubmitPage from './pages/support-ticket-submit';

// Search & Discovery
import SearchResultsPage from './pages/search-results';
import VendorFeedPage from './pages/vendor-feed';

// Admin Pages
import AdminDashboardPage from './pages/admin-dashboard';
import AdminControlCenterPage from './pages/admin-control-center';
import AdminUserManagementPage from './pages/admin-user-management';
import AdminTransactionsPage from './pages/admin-transactions';
import AdminEscrowManagementPage from './pages/admin-escrow-management';
import AdminFraudPage from './pages/admin-fraud';
import AdminModerationPage from './pages/admin-moderation';
import AdminMonitoringPage from './pages/admin-monitoring';
import AdminRealTimeDashboardPage from './pages/admin-real-time-dashboard';
import AdminSupportPage from './pages/admin-support';
import AdminKycVerificationPage from './pages/admin-kyc-verification';
import MerchantKycVerificationPage from './pages/merchant-kyc-verification';

// Management Pages
import OrderManagementPage from './pages/order-management';
import MerchantAnalyticsPage from './pages/merchant-analytics';

// Other Pages
import SideMenuPage from './pages/side-menu';
import NotFoundPage from './pages/not-found';

// New Imports for Enhanced Pages
import RealTimeTrackingEnhanced from './pages/real-time-tracking-enhanced';
import LiveChatEnhanced from './pages/live-chat-enhanced';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Switch>
            {/* Auth Flow */}
            <Route path="/" component={SplashPage} />
            <Route path="/onboarding" component={OnboardingPage} />
            <Route path="/role-selection" component={RoleSelectionPage} />
            <Route path="/signup" component={SignupPage} />
            <Route path="/signin" component={SigninPage} />
            <Route path="/otp-verification" component={OtpVerificationPage} />
            <Route path="/driver-tier-selection" component={DriverTierSelectionPage} />
            <Route path="/driver-registration" component={DriverRegistrationPage} />
            <Route path="/location-setup" component={LocationSetupPage} />
            <Route path="/identity-verification" component={IdentityVerificationPage} />
            <Route path="/enhanced-verification" component={EnhancedVerificationPage} />
            <Route path="/mfa-setup" component={MfaSetupPage} />
            <Route path="/biometric-setup" component={BiometricSetupPage} />
            <Route path="/forgot-password" component={ForgotPasswordPage} />
            <Route path="/reset-password" component={ResetPasswordPage} />

            {/* Dashboard Routes */}
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/consumer-home" component={ConsumerHomePage} />
            <Route path="/driver-dashboard" component={DriverDashboardPage} />
            <Route path="/driver-dashboard-enhanced" component={DriverDashboardEnhancedPage} />
            <Route path="/merchant-dashboard" component={MerchantDashboardPage} />
            <Route path="/merchant-dashboard-enhanced" component={MerchantDashboardEnhancedPage} />

            {/* Core Feature Routes */}
            <Route path="/map-home" component={MapHomePage} />
            <Route path="/commodities" component={CommoditiesPage} />
            <Route path="/merchants" component={MerchantsPage} />
            <Route path="/cart" component={CartPage} />
            <Route path="/checkout" component={CheckoutPage} />
            <Route path="/order-confirmation" component={OrderConfirmationPage} />
            <Route path="/track-order" component={TrackOrderPage} />
            <Route path="/order-history" component={OrderHistoryPage} />
            <Route path="/order-history/:id" component={OrderHistoryDetailPage} />
            <Route path="/real-time-tracking" component={RealTimeTrackingPage} />
            <Route path="/delivery-detail" component={DeliveryDetailPage} />

            {/* Fuel Services */}
            <Route path="/fuel-ordering" component={FuelOrderingPage} />
            <Route path="/fuel-order-details" component={FuelOrderDetailsPage} />
            <Route path="/fuel-delivery-tracking" component={FuelDeliveryTrackingPage} />

            {/* Toll Services */}
            <Route path="/toll-payments" component={TollPaymentsPage} />
            <Route path="/toll-payments-enhanced" component={TollPaymentsEnhancedPage} />
            <Route path="/toll-payment-success" component={TollPaymentSuccessPage} />
            <Route path="/qr-scanner" component={QRScannerPage} />

            {/* Wallet & Financial Services */}
            <Route path="/wallet-balance" component={WalletBalancePage} />
            <Route path="/wallet-fund" component={WalletFundPage} />
            <Route path="/wallet-fund-callback" component={WalletFundCallbackPage} />
            <Route path="/wallet-transactions" component={WalletTransactionsPage} />
            <Route path="/payment-methods" component={PaymentMethodsPage} />
            <Route path="/add-payment-method" component={AddPaymentMethodPage} />
            <Route path="/money-transfer" component={MoneyTransferPage} />
            <Route path="/bills-payment" component={BillsPaymentPage} />
            <Route path="/driver-withdrawal" component={DriverWithdrawalPage} />

            {/* Account Management */}
            <Route path="/profile" component={ProfilePage} />
            <Route path="/edit-profile" component={EditProfilePage} />
            <Route path="/account-settings" component={AccountSettingsPage} />
            <Route path="/notifications" component={NotificationsPage} />
            <Route path="/messages" component={MessagesPage} />
            <Route path="/chat" component={ChatPage} />

            {/* Support */}
            <Route path="/support" component={SupportPage} />
            <Route path="/support-ticket-submit" component={SupportTicketSubmitPage} />

            {/* Discovery */}
            <Route path="/search-results" component={SearchResultsPage} />
            <Route path="/vendor-feed" component={VendorFeedPage} />

            {/* Admin Panel */}
            <Route path="/admin-dashboard" component={AdminDashboardPage} />
            <Route path="/admin-control-center" component={AdminControlCenterPage} />
            <Route path="/admin-users" component={AdminUserManagementPage} />
            <Route path="/admin-transactions" component={AdminTransactionsPage} />
            <Route path="/admin-escrow" component={AdminEscrowManagementPage} />
            <Route path="/admin-fraud" component={AdminFraudPage} />
            <Route path="/admin-moderation" component={AdminModerationPage} />
            <Route path="/admin-monitoring" component={AdminMonitoringPage} />
            <Route path="/admin-real-time" component={AdminRealTimeDashboardPage} />
            <Route path="/admin-support" component={AdminSupportPage} />
            <Route path="/admin-kyc" component={AdminKycVerificationPage} />
            <Route path="/merchant-kyc" component={MerchantKycVerificationPage} />

            {/* Management */}
            <Route path="/order-management" component={OrderManagementPage} />
            <Route path="/merchant-analytics" component={MerchantAnalyticsPage} />

            {/* Utility */}
            <Route path="/side-menu" component={SideMenuPage} />

            {/* Enhanced Real-Time Pages */}
            <Route path="/real-time-tracking-enhanced" component={RealTimeTrackingEnhanced} />
            <Route path="/live-chat-enhanced" component={LiveChatEnhanced} />

            {/* 404 Fallback */}
            <Route component={NotFoundPage} />
          </Switch>

          {/* Global Components */}
          <Toaster />
          <NotificationSystem />
        </div>
      </Router>
    </QueryClientProvider>
  );
}