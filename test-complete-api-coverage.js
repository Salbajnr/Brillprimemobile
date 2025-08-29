
const axios = require('axios');
const colors = require('colors');

const BASE_URL = process.env.REPL_URL || 'http://localhost:5000';

class ComprehensiveAPITester {
  constructor() {
    this.results = [];
    this.authTokens = {};
    this.testUsers = {
      consumer: { email: 'consumer@test.com', password: 'TestPass123!', role: 'CONSUMER' },
      merchant: { email: 'merchant@test.com', password: 'TestPass123!', role: 'MERCHANT' },
      driver: { email: 'driver@test.com', password: 'TestPass123!', role: 'DRIVER' },
      admin: { email: 'admin@test.com', password: 'TestPass123!', role: 'ADMIN' }
    };
  }

  async makeRequest(method, endpoint, data = {}, headers = {}) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 10000,
        validateStatus: () => true
      };

      const response = await axios(config);
      
      return {
        success: response.status < 400,
        status: response.status,
        data: response.data,
        endpoint,
        method
      };
    } catch (error) {
      return {
        success: false,
        status: 'ERROR',
        error: error.message,
        endpoint,
        method
      };
    }
  }

  async setupTestUsers() {
    console.log('🔧 Setting up test users...'.cyan);
    
    for (const [role, userData] of Object.entries(this.testUsers)) {
      // Try to register user
      const registerResult = await this.makeRequest('POST', '/api/auth/register', userData);
      
      // Login to get token
      const loginResult = await this.makeRequest('POST', '/api/auth/login', {
        email: userData.email,
        password: userData.password
      });

      if (loginResult.success && loginResult.data.token) {
        this.authTokens[role] = loginResult.data.token;
        console.log(`   ✅ ${role.toUpperCase()} user ready`.green);
      } else {
        console.log(`   ⚠️ ${role.toUpperCase()} user setup failed`.yellow);
      }
    }
  }

  async testConsumerAPIs() {
    console.log('\n👤 Testing Consumer APIs...'.blue.bold);
    
    const token = this.authTokens.consumer;
    const headers = { 'Authorization': `Bearer ${token}` };

    const consumerEndpoints = [
      { method: 'GET', path: '/api/consumer/dashboard', description: 'Get consumer dashboard' },
      { method: 'GET', path: '/api/consumer/profile', description: 'Get consumer profile' },
      { method: 'GET', path: '/api/consumer/categories', description: 'Get categories' },
      { method: 'GET', path: '/api/consumer/products', description: 'Get products' },
      { method: 'GET', path: '/api/consumer/orders', description: 'Get consumer orders' },
      { method: 'POST', path: '/api/consumer/orders', description: 'Create order', 
        data: {
          merchantId: 1,
          orderType: 'PRODUCT',
          totalAmount: 5000,
          deliveryAddress: 'Test Address, Lagos',
          orderData: { items: [{ productId: '1', quantity: 2 }] }
        }
      },
      { method: 'GET', path: '/api/consumer/transactions', description: 'Get transactions' },
      { method: 'POST', path: '/api/consumer/ratings', description: 'Submit rating',
        data: {
          orderId: 1,
          rating: 5,
          comment: 'Excellent service!'
        }
      }
    ];

    for (const endpoint of consumerEndpoints) {
      const result = await this.makeRequest(
        endpoint.method, 
        endpoint.path, 
        endpoint.data || {}, 
        headers
      );
      
      console.log(`   ${result.success ? '✅' : '❌'} ${endpoint.description} - Status: ${result.status}`.green);
      this.results.push(result);
    }
  }

  async testMerchantAPIs() {
    console.log('\n🏪 Testing Merchant APIs...'.blue.bold);
    
    const token = this.authTokens.merchant;
    const headers = { 'Authorization': `Bearer ${token}` };

    const merchantEndpoints = [
      { method: 'GET', path: '/api/merchant/dashboard', description: 'Get merchant dashboard' },
      { method: 'GET', path: '/api/merchant/orders', description: 'Get merchant orders' },
      { method: 'GET', path: '/api/merchant/products', description: 'Get merchant products' },
      { method: 'POST', path: '/api/merchant/products', description: 'Create product',
        data: {
          name: 'Test Product',
          description: 'A test product',
          price: 1000,
          category: 'Electronics',
          unit: 'piece',
          stockQuantity: 50
        }
      },
      { method: 'PUT', path: '/api/merchant/orders/1/status', description: 'Update order status',
        data: {
          status: 'CONFIRMED',
          notes: 'Order confirmed by merchant'
        }
      },
      { method: 'GET', path: '/api/merchant/analytics/revenue', description: 'Get revenue analytics' },
      { method: 'GET', path: '/api/merchant/reviews', description: 'Get merchant reviews' }
    ];

    for (const endpoint of merchantEndpoints) {
      const result = await this.makeRequest(
        endpoint.method, 
        endpoint.path, 
        endpoint.data || {}, 
        headers
      );
      
      console.log(`   ${result.success ? '✅' : '❌'} ${endpoint.description} - Status: ${result.status}`.green);
      this.results.push(result);
    }
  }

  async testDriverAPIs() {
    console.log('\n🚗 Testing Driver APIs...'.blue.bold);
    
    const token = this.authTokens.driver;
    const headers = { 'Authorization': `Bearer ${token}` };

    const driverEndpoints = [
      { method: 'GET', path: '/api/driver/dashboard', description: 'Get driver dashboard' },
      { method: 'GET', path: '/api/driver/profile', description: 'Get driver profile' },
      { method: 'PUT', path: '/api/driver/status', description: 'Update driver status',
        data: {
          isOnline: true,
          isAvailable: true,
          currentLocation: { latitude: 6.5244, longitude: 3.3792 }
        }
      },
      { method: 'GET', path: '/api/driver/delivery-requests', description: 'Get delivery requests' },
      { method: 'POST', path: '/api/driver/accept-delivery', description: 'Accept delivery',
        data: {
          orderId: '1',
          estimatedDeliveryTime: 30
        }
      },
      { method: 'GET', path: '/api/driver/earnings', description: 'Get driver earnings' },
      { method: 'GET', path: '/api/driver/orders', description: 'Get driver orders' },
      { method: 'GET', path: '/api/driver/performance', description: 'Get driver performance' }
    ];

    for (const endpoint of driverEndpoints) {
      const result = await this.makeRequest(
        endpoint.method, 
        endpoint.path, 
        endpoint.data || {}, 
        headers
      );
      
      console.log(`   ${result.success ? '✅' : '❌'} ${endpoint.description} - Status: ${result.status}`.green);
      this.results.push(result);
    }
  }

  async testWalletAPIs() {
    console.log('\n💰 Testing Wallet APIs...'.blue.bold);
    
    const token = this.authTokens.consumer;
    const headers = { 'Authorization': `Bearer ${token}` };

    const walletEndpoints = [
      { method: 'GET', path: '/api/wallet/balance', description: 'Get wallet balance' },
      { method: 'POST', path: '/api/wallet/fund', description: 'Fund wallet',
        data: {
          amount: 10000,
          email: 'consumer@test.com',
          paymentMethod: 'card'
        }
      },
      { method: 'GET', path: '/api/wallet/transactions', description: 'Get wallet transactions' },
      { method: 'GET', path: '/api/wallet/banks', description: 'Get available banks' },
      { method: 'POST', path: '/api/wallet/validate-account', description: 'Validate bank account',
        data: {
          accountNumber: '1234567890',
          bankCode: '044'
        }
      }
    ];

    for (const endpoint of walletEndpoints) {
      const result = await this.makeRequest(
        endpoint.method, 
        endpoint.path, 
        endpoint.data || {}, 
        headers
      );
      
      console.log(`   ${result.success ? '✅' : '❌'} ${endpoint.description} - Status: ${result.status}`.green);
      this.results.push(result);
    }
  }

  async testFuelOrderAPIs() {
    console.log('\n⛽ Testing Fuel Order APIs...'.blue.bold);
    
    const token = this.authTokens.consumer;
    const headers = { 'Authorization': `Bearer ${token}` };

    const fuelEndpoints = [
      { method: 'GET', path: '/api/fuel/stations?lat=6.5244&lng=3.3792', description: 'Get fuel stations' },
      { method: 'POST', path: '/api/fuel-orders', description: 'Create fuel order',
        data: {
          stationId: 'station_001',
          fuelType: 'PMS',
          quantity: 20,
          unitPrice: 617,
          totalAmount: 12340,
          deliveryAddress: 'Test Address, Lagos',
          deliveryLatitude: 6.5244,
          deliveryLongitude: 3.3792
        }
      },
      { method: 'GET', path: '/api/fuel/orders', description: 'Get fuel orders' }
    ];

    for (const endpoint of fuelEndpoints) {
      const result = await this.makeRequest(
        endpoint.method, 
        endpoint.path, 
        endpoint.data || {}, 
        headers
      );
      
      console.log(`   ${result.success ? '✅' : '❌'} ${endpoint.description} - Status: ${result.status}`.green);
      this.results.push(result);
    }
  }

  async testPaymentAPIs() {
    console.log('\n💳 Testing Payment APIs...'.blue.bold);
    
    const token = this.authTokens.consumer;
    const headers = { 'Authorization': `Bearer ${token}` };

    const paymentEndpoints = [
      { method: 'POST', path: '/api/payments/initialize', description: 'Initialize payment',
        data: {
          amount: 5000,
          email: 'consumer@test.com',
          paymentMethod: 'card'
        }
      },
      { method: 'GET', path: '/api/payments', description: 'Get payment history' }
    ];

    for (const endpoint of paymentEndpoints) {
      const result = await this.makeRequest(
        endpoint.method, 
        endpoint.path, 
        endpoint.data || {}, 
        headers
      );
      
      console.log(`   ${result.success ? '✅' : '❌'} ${endpoint.description} - Status: ${result.status}`.green);
      this.results.push(result);
    }
  }

  async testAnalyticsAPIs() {
    console.log('\n📊 Testing Analytics APIs...'.blue.bold);
    
    const analyticsEndpoints = [
      { method: 'GET', path: '/api/analytics/dashboard', description: 'Get dashboard analytics' },
      { method: 'GET', path: '/api/categories', description: 'Get categories' },
      { method: 'GET', path: '/api/health', description: 'Health check' }
    ];

    for (const endpoint of analyticsEndpoints) {
      const result = await this.makeRequest(endpoint.method, endpoint.path);
      
      console.log(`   ${result.success ? '✅' : '❌'} ${endpoint.description} - Status: ${result.status}`.green);
      this.results.push(result);
    }
  }

  async testDatabaseConnectivity() {
    console.log('\n🗄️ Testing Database Connectivity...'.blue.bold);
    
    // Test basic database operations through health check
    const dbTest = await this.makeRequest('GET', '/api/health');
    
    if (dbTest.success) {
      console.log('   ✅ Database connection healthy'.green);
    } else {
      console.log('   ❌ Database connection issues'.red);
    }
    
    this.results.push(dbTest);
  }

  generateReport() {
    console.log('\n📋 API Coverage Report'.yellow.bold);
    console.log('='.repeat(50).yellow);

    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const coverage = ((successful / total) * 100).toFixed(1);

    console.log(`\nTotal APIs Tested: ${total}`.cyan);
    console.log(`Successful: ${successful}`.green);
    console.log(`Failed: ${failed}`.red);
    console.log(`Coverage: ${coverage}%`.yellow);

    if (failed > 0) {
      console.log('\n❌ Failed Endpoints:'.red.bold);
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`   ${result.method} ${result.endpoint} - Status: ${result.status}`.red);
        if (result.error) {
          console.log(`      Error: ${result.error}`.red);
        }
      });
    }

    // Database integration check
    const hasDBConnectivity = this.results.some(r => 
      r.endpoint.includes('/health') && r.success
    );

    console.log(`\n🗄️ Database Integration: ${hasDBConnectivity ? '✅ Connected' : '❌ Issues'}`.cyan);

    // Role-based API completeness
    const consumerAPIs = this.results.filter(r => r.endpoint.includes('/consumer')).length;
    const merchantAPIs = this.results.filter(r => r.endpoint.includes('/merchant')).length;
    const driverAPIs = this.results.filter(r => r.endpoint.includes('/driver')).length;

    console.log('\n📊 Role-based API Coverage:'.cyan.bold);
    console.log(`   Consumer APIs: ${consumerAPIs}`.cyan);
    console.log(`   Merchant APIs: ${merchantAPIs}`.cyan);
    console.log(`   Driver APIs: ${driverAPIs}`.cyan);

    console.log(`\n🎯 Overall System Completeness: ${coverage >= 80 ? '✅ EXCELLENT' : coverage >= 60 ? '⚠️ GOOD' : '❌ NEEDS WORK'}`.yellow.bold);
  }

  async runCompleteTest() {
    console.log('🚀 Starting Comprehensive API Coverage Test\n'.rainbow.bold);
    
    try {
      await this.setupTestUsers();
      await this.testDatabaseConnectivity();
      await this.testConsumerAPIs();
      await this.testMerchantAPIs();
      await this.testDriverAPIs();
      await this.testWalletAPIs();
      await this.testFuelOrderAPIs();
      await this.testPaymentAPIs();
      await this.testAnalyticsAPIs();
      
      this.generateReport();
      
      console.log('\n✅ Comprehensive API test completed!'.green.bold);
      
    } catch (error) {
      console.error('\n❌ Test execution failed:'.red.bold, error.message);
    }
  }
}

// Run the comprehensive test
if (require.main === module) {
  const tester = new ComprehensiveAPITester();
  tester.runCompleteTest();
}

module.exports = ComprehensiveAPITester;
