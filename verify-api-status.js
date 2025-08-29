
#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const BASE_URL = process.env.REPL_URL || 'http://0.0.0.0:5000';

// Critical endpoints to test
const CRITICAL_ENDPOINTS = [
  { method: 'GET', path: '/api/health', description: 'Health Check' },
  { method: 'GET', path: '/api/health/detailed', description: 'Detailed Health Check' },
  { method: 'GET', path: '/api/categories', description: 'Get Categories' },
  { method: 'GET', path: '/api/orders', description: 'Get Orders' },
  { method: 'GET', path: '/api/analytics/dashboard', description: 'Dashboard Analytics' },
  { method: 'GET', path: '/api/driver/dashboard', description: 'Driver Dashboard' },
  { method: 'GET', path: '/api/merchant/dashboard', description: 'Merchant Dashboard' },
  { method: 'GET', path: '/api/wallet/balance', description: 'Wallet Balance' },
  { method: 'POST', path: '/api/auth/login', description: 'User Login' },
  { method: 'POST', path: '/api/auth/register', description: 'User Registration' }
];

async function testEndpoint(endpoint) {
  try {
    const config = {
      method: endpoint.method.toLowerCase(),
      url: `${BASE_URL}${endpoint.path}`,
      timeout: 5000,
      validateStatus: () => true
    };

    // Add sample data for POST requests
    if (endpoint.method === 'POST') {
      config.headers = { 'Content-Type': 'application/json' };
      if (endpoint.path.includes('/login')) {
        config.data = { email: 'test@example.com', password: 'testpass123' };
      } else if (endpoint.path.includes('/register')) {
        config.data = { 
          email: 'test@example.com', 
          password: 'testpass123',
          fullName: 'Test User',
          role: 'CONSUMER'
        };
      }
    }

    const startTime = Date.now();
    const response = await axios(config);
    const responseTime = Date.now() - startTime;

    return {
      success: response.status < 500,
      status: response.status,
      responseTime,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      responseTime: 0,
      error: error.code === 'ECONNREFUSED' ? 'Server not running' : error.message
    };
  }
}

async function runVerification() {
  console.log('🔍 BrillPrime API Status Verification'.cyan.bold);
  console.log('=====================================\n');

  let totalTests = 0;
  let successfulTests = 0;
  let serverRunning = true;

  for (const endpoint of CRITICAL_ENDPOINTS) {
    process.stdout.write(`Testing ${endpoint.description}... `);
    
    const result = await testEndpoint(endpoint);
    totalTests++;

    if (result.success) {
      successfulTests++;
      console.log(`✅ ${result.status} (${result.responseTime}ms)`.green);
    } else {
      console.log(`❌ ${result.error || result.status}`.red);
      if (result.error === 'Server not running') {
        serverRunning = false;
      }
    }
  }

  console.log('\n📊 API Status Summary:'.cyan.bold);
  console.log(`Server Running: ${serverRunning ? '🟢 YES' : '🔴 NO'}`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Successful: ${successfulTests}`.green);
  console.log(`Failed: ${totalTests - successfulTests}`.red);
  console.log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

  if (!serverRunning) {
    console.log('\n💡 Server is not running. Start it with: npm run dev');
    return;
  }

  if (successfulTests / totalTests >= 0.8) {
    console.log('\n🎉 API Status: EXCELLENT - Ready for production!'.green.bold);
  } else if (successfulTests / totalTests >= 0.6) {
    console.log('\n⚠️ API Status: GOOD - Minor issues need attention'.yellow.bold);
  } else {
    console.log('\n❌ API Status: NEEDS WORK - Multiple endpoints failing'.red.bold);
  }

  console.log('\n🔗 Test your deployment at:', BASE_URL);
}

// Run verification
if (require.main === module) {
  runVerification().catch(console.error);
}

module.exports = { testEndpoint, runVerification };
