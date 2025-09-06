
import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://0.0.0.0:5000';
const API_BASE = `${BASE_URL}/api`;

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  responseTime: number;
  statusCode: number;
  error?: string;
}

class APITester {
  private results: TestResult[] = [];
  private authToken: string = '';
  private userId: number = 0;
  private userRole: string = '';

  async runAllTests() {
    console.log('🚀 Starting comprehensive API testing...\n');
    
    // Test categories
    try {
      await this.testAuthentication();
      await this.testCategories();
      await this.testOrders();
      await this.testAnalytics();
      await this.testDrivers();
      await this.testMerchants();
      await this.testPayments();
      await this.testWallet();
      await this.testSupport();
      await this.testAdminRoutes();
      await this.testRealTimeFeatures();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Testing failed:', error);
    }
  }

  private async makeRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
    data?: any,
    headers?: any
  ): Promise<TestResult> {
    const startTime = performance.now();
    const fullUrl = `${API_BASE}${endpoint}`;
    
    try {
      const config = {
        method,
        url: fullUrl,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 10000
      };

      const response = await axios(config);
      const responseTime = performance.now() - startTime;
      
      return {
        endpoint,
        method,
        status: 'PASS',
        responseTime: Math.round(responseTime),
        statusCode: response.status
      };
    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      
      return {
        endpoint,
        method,
        status: 'FAIL',
        responseTime: Math.round(responseTime),
        statusCode: error.response?.status || 0,
        error: error.message
      };
    }
  }

  private async testAuthentication() {
    console.log('🔐 Testing Authentication endpoints...');
    
    // Test user registration
    const registerResult = await this.makeRequest('/auth/register', 'POST', {
      email: 'test@example.com',
      password: 'testpass123',
      fullName: 'Test User',
      role: 'CONSUMER'
    });
    this.results.push(registerResult);

    // Test user login
    const loginResult = await this.makeRequest('/auth/login', 'POST', {
      email: 'test@example.com',
      password: 'testpass123'
    });
    this.results.push(loginResult);

    // Test session validation
    const sessionResult = await this.makeRequest('/auth/session');
    this.results.push(sessionResult);

    // Test logout
    const logoutResult = await this.makeRequest('/auth/logout', 'POST');
    this.results.push(logoutResult);
  }

  private async testCategories() {
    console.log('📂 Testing Categories endpoints...');
    
    // Get all categories
    const getCategoriesResult = await this.makeRequest('/categories');
    this.results.push(getCategoriesResult);

    // Create category (admin only)
    const createCategoryResult = await this.makeRequest('/categories', 'POST', {
      name: 'Test Category',
      description: 'Test category description',
      isActive: true
    });
    this.results.push(createCategoryResult);

    // Get category by ID
    const getCategoryResult = await this.makeRequest('/categories/1');
    this.results.push(getCategoryResult);

    // Update category
    const updateCategoryResult = await this.makeRequest('/categories/1', 'PUT', {
      name: 'Updated Test Category',
      description: 'Updated description'
    });
    this.results.push(updateCategoryResult);

    // Delete category
    const deleteCategoryResult = await this.makeRequest('/categories/1', 'DELETE');
    this.results.push(deleteCategoryResult);
  }

  private async testOrders() {
    console.log('📦 Testing Orders endpoints...');
    
    // Get all orders
    const getOrdersResult = await this.makeRequest('/orders');
    this.results.push(getOrdersResult);

    // Create new order
    const createOrderResult = await this.makeRequest('/orders', 'POST', {
      customerId: 1,
      merchantId: 2,
      orderType: 'COMMODITY',
      totalAmount: 25000,
      deliveryAddress: '123 Test Street, Lagos',
      orderData: {
        items: [
          { productId: 1, quantity: 2, price: 12500 }
        ]
      }
    });
    this.results.push(createOrderResult);

    // Get order by ID
    const getOrderResult = await this.makeRequest('/orders/1');
    this.results.push(getOrderResult);

    // Update order status
    const updateOrderResult = await this.makeRequest('/orders/1/status', 'PUT', {
      status: 'CONFIRMED',
      notes: 'Order confirmed and being processed'
    });
    this.results.push(updateOrderResult);

    // Get order tracking
    const trackOrderResult = await this.makeRequest('/orders/1/tracking');
    this.results.push(trackOrderResult);

    // Cancel order
    const cancelOrderResult = await this.makeRequest('/orders/1/cancel', 'POST', {
      reason: 'Customer requested cancellation'
    });
    this.results.push(cancelOrderResult);

    // Get customer orders
    const customerOrdersResult = await this.makeRequest('/orders/customer/1');
    this.results.push(customerOrdersResult);

    // Get merchant orders
    const merchantOrdersResult = await this.makeRequest('/orders/merchant/2');
    this.results.push(merchantOrdersResult);

    // Get driver orders
    const driverOrdersResult = await this.makeRequest('/orders/driver/3');
    this.results.push(driverOrdersResult);
  }

  private async testAnalytics() {
    console.log('📊 Testing Analytics endpoints...');
    
    // Get dashboard analytics
    const dashboardResult = await this.makeRequest('/analytics/dashboard');
    this.results.push(dashboardResult);

    // Get real-time metrics
    const realTimeResult = await this.makeRequest('/analytics/real-time');
    this.results.push(realTimeResult);

    // Get consumer analytics
    const consumerAnalyticsResult = await this.makeRequest('/analytics/consumer/1');
    this.results.push(consumerAnalyticsResult);

    // Get merchant analytics
    const merchantAnalyticsResult = await this.makeRequest('/analytics/merchant/2');
    this.results.push(merchantAnalyticsResult);

    // Get driver analytics
    const driverAnalyticsResult = await this.makeRequest('/analytics/driver/3');
    this.results.push(driverAnalyticsResult);

    // Get order analytics
    const orderAnalyticsResult = await this.makeRequest('/analytics/orders');
    this.results.push(orderAnalyticsResult);

    // Get revenue analytics
    const revenueAnalyticsResult = await this.makeRequest('/analytics/revenue');
    this.results.push(revenueAnalyticsResult);

    // Get performance analytics
    const performanceAnalyticsResult = await this.makeRequest('/analytics/performance');
    this.results.push(performanceAnalyticsResult);
  }

  private async testDrivers() {
    console.log('🚗 Testing Driver endpoints...');
    
    // Get driver dashboard
    const driverDashboardResult = await this.makeRequest('/driver/dashboard');
    this.results.push(driverDashboardResult);

    // Get available orders
    const availableOrdersResult = await this.makeRequest('/driver/orders/available');
    this.results.push(availableOrdersResult);

    // Accept delivery request
    const acceptDeliveryResult = await this.makeRequest('/driver/delivery/accept', 'POST', {
      deliveryRequestId: 'req_123',
      estimatedTime: 30
    });
    this.results.push(acceptDeliveryResult);

    // Update driver location
    const updateLocationResult = await this.makeRequest('/driver/location', 'POST', {
      latitude: 6.5244,
      longitude: 3.3792
    });
    this.results.push(updateLocationResult);

    // Update driver status
    const updateStatusResult = await this.makeRequest('/driver/status', 'PUT', {
      isOnline: true,
      isAvailable: true
    });
    this.results.push(updateStatusResult);

    // Get driver earnings
    const earningsResult = await this.makeRequest('/driver/earnings');
    this.results.push(earningsResult);

    // Get delivery analytics
    const deliveryAnalyticsResult = await this.makeRequest('/driver/analytics/deliveries');
    this.results.push(deliveryAnalyticsResult);

    // Update vehicle information
    const updateVehicleResult = await this.makeRequest('/driver/vehicle', 'PUT', {
      vehicleType: 'motorcycle',
      vehiclePlate: 'ABC123DE',
      vehicleModel: 'Honda 2023'
    });
    this.results.push(updateVehicleResult);

    // Get driver ratings
    const ratingsResult = await this.makeRequest('/driver/ratings');
    this.results.push(ratingsResult);

    // Submit driver feedback
    const feedbackResult = await this.makeRequest('/driver/feedback', 'POST', {
      subject: 'App Performance',
      message: 'Great app, works well!',
      rating: 5
    });
    this.results.push(feedbackResult);
  }

  private async testMerchants() {
    console.log('🏪 Testing Merchant endpoints...');
    
    // Get merchant dashboard
    const merchantDashboardResult = await this.makeRequest('/merchant/dashboard');
    this.results.push(merchantDashboardResult);

    // Get merchant products
    const productsResult = await this.makeRequest('/merchant/products');
    this.results.push(productsResult);

    // Get merchant orders
    const merchantOrdersResult = await this.makeRequest('/merchant/orders');
    this.results.push(merchantOrdersResult);

    // Update order status
    const updateOrderStatusResult = await this.makeRequest('/merchant/orders/1/status', 'PUT', {
      status: 'PREPARING',
      estimatedPreparationTime: 20
    });
    this.results.push(updateOrderStatusResult);

    // Request driver assignment
    const assignDriverResult = await this.makeRequest('/merchant/orders/1/assign-driver', 'POST');
    this.results.push(assignDriverResult);

    // Get merchant analytics
    const merchantAnalyticsResult = await this.makeRequest('/merchant/analytics');
    this.results.push(merchantAnalyticsResult);

    // Update business hours
    const updateHoursResult = await this.makeRequest('/merchant/business-hours', 'PUT', {
      monday: { open: '09:00', close: '18:00', isOpen: true },
      tuesday: { open: '09:00', close: '18:00', isOpen: true }
    });
    this.results.push(updateHoursResult);
  }

  private async testPayments() {
    console.log('💳 Testing Payment endpoints...');
    
    // Initialize payment
    const initPaymentResult = await this.makeRequest('/payments/initialize', 'POST', {
      amount: 10000,
      email: 'test@example.com',
      orderId: '1',
      paymentMethod: 'card'
    });
    this.results.push(initPaymentResult);

    // Verify payment
    const verifyPaymentResult = await this.makeRequest('/payments/verify/test_ref_123');
    this.results.push(verifyPaymentResult);

    // Get payment methods
    const paymentMethodsResult = await this.makeRequest('/payments/methods');
    this.results.push(paymentMethodsResult);

    // Process escrow payment
    const escrowPaymentResult = await this.makeRequest('/payments/escrow', 'POST', {
      orderId: '1',
      amount: 15000,
      paymentMethod: 'card'
    });
    this.results.push(escrowPaymentResult);

    // Release escrow
    const releaseEscrowResult = await this.makeRequest('/payments/escrow/1/release', 'POST');
    this.results.push(releaseEscrowResult);
  }

  private async testWallet() {
    console.log('💰 Testing Wallet endpoints...');
    
    // Get wallet balance
    const balanceResult = await this.makeRequest('/wallet/balance');
    this.results.push(balanceResult);

    // Fund wallet
    const fundWalletResult = await this.makeRequest('/wallet/fund', 'POST', {
      amount: 5000,
      paymentMethod: 'card'
    });
    this.results.push(fundWalletResult);

    // Transfer funds
    const transferResult = await this.makeRequest('/wallet/transfer', 'POST', {
      recipientEmail: 'recipient@example.com',
      amount: 1000,
      description: 'Test transfer'
    });
    this.results.push(transferResult);

    // Get transaction history
    const transactionsResult = await this.makeRequest('/wallet/transactions');
    this.results.push(transactionsResult);

    // Withdraw funds
    const withdrawResult = await this.makeRequest('/wallet/withdraw', 'POST', {
      amount: 2000,
      bankAccount: {
        accountNumber: '1234567890',
        bankCode: '044'
      }
    });
    this.results.push(withdrawResult);
  }

  private async testSupport() {
    console.log('🎧 Testing Support endpoints...');
    
    // Create support ticket
    const createTicketResult = await this.makeRequest('/support/tickets', 'POST', {
      subject: 'Test Support Issue',
      message: 'This is a test support ticket',
      priority: 'NORMAL'
    });
    this.results.push(createTicketResult);

    // Get support tickets
    const getTicketsResult = await this.makeRequest('/support/tickets');
    this.results.push(getTicketsResult);

    // Get ticket by ID
    const getTicketResult = await this.makeRequest('/support/tickets/1');
    this.results.push(getTicketResult);

    // Update ticket status
    const updateTicketResult = await this.makeRequest('/support/tickets/1', 'PUT', {
      status: 'IN_PROGRESS',
      adminNotes: 'Working on this issue'
    });
    this.results.push(updateTicketResult);

    // Add ticket response
    const addResponseResult = await this.makeRequest('/support/tickets/1/responses', 'POST', {
      message: 'Thank you for your inquiry, we are looking into this.',
      responderType: 'ADMIN'
    });
    this.results.push(addResponseResult);
  }

  private async testAdminRoutes() {
    console.log('👑 Testing Admin endpoints...');
    
    // Get all users
    const getUsersResult = await this.makeRequest('/admin/users');
    this.results.push(getUsersResult);

    // Get user statistics
    const userStatsResult = await this.makeRequest('/admin/users/stats');
    this.results.push(userStatsResult);

    // Get system health
    const healthResult = await this.makeRequest('/admin/system/health');
    this.results.push(healthResult);

    // Get transaction metrics
    const transactionMetricsResult = await this.makeRequest('/admin/transactions/metrics');
    this.results.push(transactionMetricsResult);

    // Get KYC submissions
    const kycSubmissionsResult = await this.makeRequest('/admin/kyc/submissions');
    this.results.push(kycSubmissionsResult);

    // Review KYC submission
    const reviewKycResult = await this.makeRequest('/admin/kyc/review/1', 'POST', {
      action: 'approve',
      notes: 'All documents verified'
    });
    this.results.push(reviewKycResult);
  }

  private async testRealTimeFeatures() {
    console.log('⚡ Testing Real-time features...');
    
    // Test location tracking
    const trackingResult = await this.makeRequest('/tracking/orders/1/location');
    this.results.push(trackingResult);

    // Test driver coordination
    const coordinationResult = await this.makeRequest('/driver-merchant-coordination/request', 'POST', {
      orderId: '1',
      merchantId: 2,
      driverId: 3,
      requestType: 'PICKUP_READY',
      message: 'Order is ready for pickup'
    });
    this.results.push(coordinationResult);

    // Test chat system
    const chatResult = await this.makeRequest('/chat/conversations');
    this.results.push(chatResult);

    // Test notifications
    const notificationsResult = await this.makeRequest('/notifications');
    this.results.push(notificationsResult);
  }

  private printResults() {
    console.log('\n📋 API Testing Results\n');
    console.log('='.repeat(80));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    console.log(`✅ PASSED: ${passed}`);
    console.log(`❌ FAILED: ${failed}`);
    console.log(`⏭️  SKIPPED: ${skipped}`);
    console.log(`📊 TOTAL: ${this.results.length}`);
    console.log('='.repeat(80));
    
    // Group results by status
    const failedTests = this.results.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failedTests.forEach(test => {
        console.log(`   ${test.method} ${test.endpoint} - ${test.statusCode} (${test.responseTime}ms)`);
        if (test.error) {
          console.log(`      Error: ${test.error}`);
        }
      });
    }
    
    // Show performance summary
    const avgResponseTime = Math.round(
      this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length
    );
    console.log(`\n⏱️  Average Response Time: ${avgResponseTime}ms`);
    
    // Show slowest endpoints
    const slowestTests = this.results
      .filter(r => r.status === 'PASS')
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 5);
      
    if (slowestTests.length > 0) {
      console.log('\n🐌 SLOWEST ENDPOINTS:');
      slowestTests.forEach(test => {
        console.log(`   ${test.method} ${test.endpoint} - ${test.responseTime}ms`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 Testing completed!');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new APITester();
  tester.runAllTests().catch(console.error);
}

export { APITester };
