
const http = require('http');
const https = require('https');

console.log('🔍 BrillPrime Production Readiness Test');
console.log('=====================================\n');

// Test configuration
const BASE_URL = process.env.API_URL || 'http://0.0.0.0:5000';
const TIMEOUT = 10000; // 10 seconds

// Test endpoints
const endpoints = [
  { path: '/api/health', method: 'GET', critical: true },
  { path: '/api/mobile-health', method: 'GET', critical: true },
  { path: '/api/system-health', method: 'GET', critical: true },
  { path: '/api/auth/signup', method: 'POST', critical: true },
  { path: '/api/auth/signin', method: 'POST', critical: true },
  { path: '/api/products', method: 'GET', critical: false },
  { path: '/api/categories', method: 'GET', critical: false },
  { path: '/api/fuel-orders', method: 'GET', critical: false },
  { path: '/api/toll-payments', method: 'GET', critical: false },
  { path: '/api/wallet/balance', method: 'GET', critical: false },
];

// Test server connectivity first
async function testServerConnectivity() {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      resolve(true);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => resolve(false));
    req.end();
  });
}

// Test individual endpoint
async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + endpoint.path);
    const client = url.protocol === 'https:' ? https : http;
    
    const postData = endpoint.method === 'POST' ? JSON.stringify({
      email: 'test@example.com',
      password: 'test123456'
    }) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: endpoint.method,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BrillPrime-Production-Test/1.0'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const success = res.statusCode >= 200 && res.statusCode < 500;
        resolve({
          success,
          status: res.statusCode,
          response: data,
          responseTime: Date.now() - startTime
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      resolve({
        success: false,
        error: 'Request timeout',
        responseTime: TIMEOUT
      });
    });

    const startTime = Date.now();
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log(`🔗 Testing server: ${BASE_URL}`);
  
  // Test basic connectivity
  const serverRunning = await testServerConnectivity();
  console.log(`Server Status: ${serverRunning ? '🟢 RUNNING' : '🔴 NOT RUNNING'}\n`);

  if (!serverRunning) {
    console.log('❌ Server is not responding. Please start the server first.');
    console.log('💡 Run: npm run dev or npm start');
    return;
  }

  // Test all endpoints
  console.log('🧪 Testing API Endpoints:');
  console.log('------------------------');

  const results = [];
  let passed = 0;
  let criticalPassed = 0;
  let criticalTotal = 0;

  for (const endpoint of endpoints) {
    process.stdout.write(`${endpoint.method} ${endpoint.path}... `);
    
    const result = await testEndpoint(endpoint);
    results.push({ endpoint, result });

    if (endpoint.critical) {
      criticalTotal++;
      if (result.success) criticalPassed++;
    }

    if (result.success) {
      passed++;
      console.log(`✅ ${result.status} (${result.responseTime}ms)`);
    } else {
      console.log(`❌ ${result.error || result.status}`);
    }
  }

  const total = endpoints.length;

  console.log('\n📊 PRODUCTION READINESS SUMMARY');
  console.log('==============================');
  console.log(`Server Status: ${serverRunning ? '🟢 RUNNING' : '🔴 NOT RUNNING'}`);
  console.log(`Total Endpoints: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Critical Endpoints: ${criticalPassed}/${criticalTotal}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  // Environment check
  console.log('\n🔧 Environment Configuration:');
  console.log('----------------------------');
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    REDIS_URL: process.env.REDIS_URL,
  };

  for (const [key, value] of Object.entries(envVars)) {
    const status = value ? '✅ Set' : '❌ Missing';
    console.log(`${key}: ${status}`);
  }

  // Overall assessment
  console.log('\n🎯 DEPLOYMENT READINESS:');
  if (criticalPassed === criticalTotal && passed >= total * 0.8) {
    console.log('🟢 PRODUCTION READY!');
    console.log('Your backend is ready for deployment.');
  } else if (criticalPassed === criticalTotal) {
    console.log('🟡 MOSTLY READY');
    console.log('Core functionality works, some optional features need attention.');
  } else {
    console.log('🔴 NOT READY');
    console.log('Critical issues need to be resolved before deployment.');
  }

  console.log('\n🚀 Next Steps:');
  if (!serverRunning) {
    console.log('1. Start the server: npm run dev or npm start');
  }
  if (criticalPassed < criticalTotal) {
    console.log('2. Fix critical endpoint failures');
  }
  if (!process.env.DATABASE_URL) {
    console.log('3. Configure production database (PostgreSQL recommended)');
  }
  if (!process.env.JWT_SECRET) {
    console.log('4. Set JWT_SECRET and SESSION_SECRET environment variables');
  }
  console.log('5. Configure SSL/TLS for production');
  console.log('6. Set up process manager (PM2 recommended)');
  console.log('7. Configure reverse proxy (Nginx/Apache)');
  console.log('8. Set up monitoring and logging');

  console.log('\n📚 Deployment Guide: ./deployment-guide.md');
  console.log('🔧 Universal Deploy Script: ./deploy-anywhere.sh');
}

// Run the tests
runTests().catch(console.error);
