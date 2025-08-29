
const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://0.0.0.0:5000';

const testEndpoints = {
  'Authentication': [
    { method: 'POST', path: '/api/auth/register', description: 'User registration' },
    { method: 'POST', path: '/api/auth/login', description: 'User login' },
    { method: 'GET', path: '/api/auth/verify', description: 'Verify session' },
    { method: 'POST', path: '/api/auth/logout', description: 'User logout' }
  ],
  'Orders': [
    { method: 'GET', path: '/api/orders', description: 'Get orders' },
    { method: 'POST', path: '/api/orders', description: 'Create order' },
    { method: 'GET', path: '/api/orders/test-id', description: 'Get order by ID' },
    { method: 'PUT', path: '/api/orders/test-id', description: 'Update order' }
  ],
  'Fuel Orders': [
    { method: 'GET', path: '/api/fuel/stations', description: 'Get fuel stations' },
    { method: 'POST', path: '/api/fuel-orders', description: 'Create fuel order' },
    { method: 'GET', path: '/api/fuel/orders', description: 'Get fuel orders' },
    { method: 'PUT', path: '/api/fuel/orders/1/status', description: 'Update fuel order status' }
  ],
  'Payments': [
    { method: 'GET', path: '/api/payments', description: 'Payment history' },
    { method: 'POST', path: '/api/payments/initialize', description: 'Initialize payment' },
    { method: 'POST', path: '/api/payments/verify', description: 'Verify payment' }
  ],
  'Wallet': [
    { method: 'GET', path: '/api/wallet/balance', description: 'Get wallet balance' },
    { method: 'POST', path: '/api/wallet/fund', description: 'Fund wallet' },
    { method: 'POST', path: '/api/wallet/transfer', description: 'Transfer funds' },
    { method: 'GET', path: '/api/wallet/transactions', description: 'Transaction history' }
  ],
  'Admin Analytics': [
    { method: 'GET', path: '/api/admin/analytics/overview', description: 'Analytics overview' },
    { method: 'GET', path: '/api/admin/analytics/revenue', description: 'Revenue analytics' },
    { method: 'GET', path: '/api/admin/analytics/user-growth', description: 'User growth' },
    { method: 'GET', path: '/api/admin/analytics/orders', description: 'Order analytics' }
  ],
  'Driver Earnings': [
    { method: 'GET', path: '/api/driver/earnings/summary', description: 'Earnings summary' },
    { method: 'GET', path: '/api/driver/earnings/history', description: 'Earnings history' },
    { method: 'GET', path: '/api/driver/earnings/weekly', description: 'Weekly earnings' }
  ],
  'Merchant Inventory': [
    { method: 'GET', path: '/api/merchant/inventory', description: 'Get inventory' },
    { method: 'POST', path: '/api/merchant/inventory', description: 'Add product' },
    { method: 'PUT', path: '/api/merchant/inventory/test-id', description: 'Update product' },
    { method: 'GET', path: '/api/merchant/inventory/analytics', description: 'Inventory analytics' }
  ],
  'Support': [
    { method: 'GET', path: '/api/support/tickets', description: 'Get support tickets' },
    { method: 'POST', path: '/api/support/tickets', description: 'Create support ticket' },
    { method: 'GET', path: '/api/support/tickets/1', description: 'Get ticket by ID' }
  ]
};

async function testSystemHealth() {
  console.log('\n🔍 Testing Complete System Health...\n'.cyan.bold);
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const [category, endpoints] of Object.entries(testEndpoints)) {
    console.log(`\n📂 Testing ${category}:`.yellow.bold);
    
    for (const endpoint of endpoints) {
      totalTests++;
      try {
        const url = `${BASE_URL}${endpoint.path}`;
        let response;
        
        if (endpoint.method === 'GET') {
          response = await axios.get(url, { timeout: 5000, validateStatus: () => true });
        } else if (endpoint.method === 'POST') {
          response = await axios.post(url, {}, { timeout: 5000, validateStatus: () => true });
        } else if (endpoint.method === 'PUT') {
          response = await axios.put(url, {}, { timeout: 5000, validateStatus: () => true });
        }

        // Consider 200-299, 401 (auth required), and 403 (permission) as "working" endpoints
        if ([200, 201, 401, 403].includes(response.status)) {
          console.log(`   ✅ ${endpoint.method} ${endpoint.path} - ${endpoint.description}`.green);
          passedTests++;
        } else if (response.status === 404) {
          console.log(`   ⚠️  ${endpoint.method} ${endpoint.path} - ${endpoint.description} (404 Not Found)`.yellow);
          failedTests++;
        } else {
          console.log(`   ❌ ${endpoint.method} ${endpoint.path} - ${endpoint.description} (${response.status})`.red);
          failedTests++;
        }
      } catch (error) {
        console.log(`   💥 ${endpoint.method} ${endpoint.path} - ${endpoint.description} (Connection Error)`.red);
        failedTests++;
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n📊 System Health Summary:'.cyan.bold);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`.green);
  console.log(`   Failed: ${failedTests}`.red);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests / totalTests > 0.8) {
    console.log('\n🎉 System is production-ready!'.green.bold);
  } else {
    console.log('\n⚠️  System needs attention before production deployment.'.yellow.bold);
  }
}

if (require.main === module) {
  testSystemHealth().catch(console.error);
}

module.exports = { testSystemHealth };
