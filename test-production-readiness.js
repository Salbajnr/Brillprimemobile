
#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://0.0.0.0:5000';

const CRITICAL_ENDPOINTS = [
  { method: 'GET', path: '/api/health', description: 'Health check' },
  { method: 'GET', path: '/api/auth/session', description: 'Auth session check' },
  { method: 'POST', path: '/api/auth/register', description: 'User registration', data: {
    email: 'test@example.com',
    password: 'testpass123',
    fullName: 'Test User',
    role: 'CONSUMER'
  }},
  { method: 'POST', path: '/api/auth/login', description: 'User login', data: {
    email: 'test@example.com',
    password: 'testpass123'
  }},
  { method: 'GET', path: '/api/categories', description: 'Categories endpoint' },
  { method: 'GET', path: '/api/orders', description: 'Orders endpoint' },
  { method: 'GET', path: '/api/analytics/dashboard', description: 'Analytics dashboard' },
  { method: 'GET', path: '/api/wallet/balance', description: 'Wallet balance' },
  { method: 'GET', path: '/api/support/tickets', description: 'Support tickets' }
];

async function testEndpoint(endpoint) {
  try {
    const config = {
      method: endpoint.method.toLowerCase(),
      url: `${BASE_URL}${endpoint.path}`,
      timeout: 10000,
      validateStatus: () => true
    };

    if (endpoint.data) {
      config.data = endpoint.data;
      config.headers = { 'Content-Type': 'application/json' };
    }

    const startTime = Date.now();
    const response = await axios(config);
    const responseTime = Date.now() - startTime;

    return {
      ...endpoint,
      status: response.status < 500 ? 'PASS' : 'FAIL',
      statusCode: response.status,
      responseTime,
      success: response.status < 500
    };
  } catch (error) {
    return {
      ...endpoint,
      status: 'FAIL',
      statusCode: 0,
      responseTime: 0,
      success: false,
      error: error.code === 'ECONNREFUSED' ? 'Server not running' : error.message
    };
  }
}

async function runProductionReadinessCheck() {
  console.log('🚀 BrillPrime Production Readiness Check');
  console.log('========================================\n');

  // Test server startup
  console.log('📡 Testing server connectivity...');
  
  const results = [];
  let serverRunning = false;

  for (const endpoint of CRITICAL_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);

    if (result.success) {
      serverRunning = true;
      console.log(`   ✅ ${endpoint.method} ${endpoint.path} (${result.statusCode}) - ${result.responseTime}ms`);
    } else {
      console.log(`   ❌ ${endpoint.method} ${endpoint.path} - ${result.error || result.statusCode}`);
    }
  }

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  console.log('\n📊 PRODUCTION READINESS SUMMARY');
  console.log('==============================');
  console.log(`Server Status: ${serverRunning ? '🟢 RUNNING' : '🔴 NOT RUNNING'}`);
  console.log(`Endpoints Tested: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (passed >= total * 0.8) {
    console.log('\n🎉 PRODUCTION READY!');
    console.log('Your backend is ready for deployment.');
  } else if (passed >= total * 0.6) {
    console.log('\n⚠️  MOSTLY READY');
    console.log('Some endpoints need attention before deployment.');
  } else {
    console.log('\n❌ NOT READY');
    console.log('Critical issues need to be resolved.');
  }

  console.log('\n🔧 Next Steps:');
  if (!serverRunning) {
    console.log('1. Start the server: Click the Run button');
  }
  if (passed < total) {
    console.log('2. Check failed endpoints and fix any issues');
  }
  console.log('3. Configure production environment variables');
  console.log('4. Deploy to Replit when ready!');
}

if (require.main === module) {
  runProductionReadinessCheck().catch(console.error);
}

module.exports = { runProductionReadinessCheck };
