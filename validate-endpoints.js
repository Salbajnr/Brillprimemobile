
#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://0.0.0.0:5000/api';

// Define all API endpoints to test
const ENDPOINTS = {
  'Health Check': [
    { method: 'GET', path: '/health', description: 'Basic health check' },
    { method: 'GET', path: '/health/detailed', description: 'Detailed system health' },
    { method: 'GET', path: '/health/endpoints', description: 'Endpoints status' }
  ],
  'Authentication': [
    { method: 'GET', path: '/auth/session', description: 'Check session' },
    { method: 'POST', path: '/auth/login', description: 'User login' },
    { method: 'POST', path: '/auth/register', description: 'User registration' },
    { method: 'POST', path: '/auth/logout', description: 'User logout' }
  ],
  'Categories': [
    { method: 'GET', path: '/categories', description: 'Get all categories' },
    { method: 'POST', path: '/categories', description: 'Create category' },
    { method: 'GET', path: '/categories/1', description: 'Get category by ID' },
    { method: 'PUT', path: '/categories/1', description: 'Update category' },
    { method: 'DELETE', path: '/categories/1', description: 'Delete category' }
  ],
  'Orders': [
    { method: 'GET', path: '/orders', description: 'Get all orders' },
    { method: 'POST', path: '/orders', description: 'Create order' },
    { method: 'GET', path: '/orders/1', description: 'Get order by ID' },
    { method: 'PUT', path: '/orders/1/status', description: 'Update order status' },
    { method: 'GET', path: '/orders/1/tracking', description: 'Track order' },
    { method: 'POST', path: '/orders/1/cancel', description: 'Cancel order' }
  ],
  'Analytics': [
    { method: 'GET', path: '/analytics/dashboard', description: 'Dashboard analytics' },
    { method: 'GET', path: '/analytics/real-time', description: 'Real-time metrics' },
    { method: 'GET', path: '/analytics/orders', description: 'Order analytics' },
    { method: 'GET', path: '/analytics/revenue', description: 'Revenue analytics' },
    { method: 'GET', path: '/analytics/performance', description: 'Performance analytics' }
  ],
  'Driver': [
    { method: 'GET', path: '/driver/dashboard', description: 'Driver dashboard' },
    { method: 'GET', path: '/driver/orders/available', description: 'Available orders' },
    { method: 'POST', path: '/driver/delivery/accept', description: 'Accept delivery' },
    { method: 'POST', path: '/driver/location', description: 'Update location' },
    { method: 'PUT', path: '/driver/status', description: 'Update status' },
    { method: 'GET', path: '/driver/earnings', description: 'Driver earnings' }
  ],
  'Merchant': [
    { method: 'GET', path: '/merchant/dashboard', description: 'Merchant dashboard' },
    { method: 'GET', path: '/merchant/products', description: 'Merchant products' },
    { method: 'GET', path: '/merchant/orders', description: 'Merchant orders' },
    { method: 'PUT', path: '/merchant/orders/1/status', description: 'Update order status' },
    { method: 'POST', path: '/merchant/orders/1/assign-driver', description: 'Assign driver' }
  ],
  'Payments': [
    { method: 'POST', path: '/payments/initialize', description: 'Initialize payment' },
    { method: 'GET', path: '/payments/verify/test_ref', description: 'Verify payment' },
    { method: 'GET', path: '/payments/methods', description: 'Payment methods' },
    { method: 'POST', path: '/payments/escrow', description: 'Escrow payment' }
  ],
  'Wallet': [
    { method: 'GET', path: '/wallet/balance', description: 'Wallet balance' },
    { method: 'POST', path: '/wallet/fund', description: 'Fund wallet' },
    { method: 'POST', path: '/wallet/transfer', description: 'Transfer funds' },
    { method: 'GET', path: '/wallet/transactions', description: 'Transaction history' }
  ],
  'Support': [
    { method: 'GET', path: '/support/tickets', description: 'Support tickets' },
    { method: 'POST', path: '/support/tickets', description: 'Create ticket' },
    { method: 'GET', path: '/support/tickets/1', description: 'Get ticket by ID' },
    { method: 'PUT', path: '/support/tickets/1', description: 'Update ticket' }
  ]
};

async function validateEndpoint(method, path, description) {
  try {
    const startTime = Date.now();
    
    const config = {
      method: method.toLowerCase(),
      url: `${BASE_URL}${path}`,
      timeout: 5000,
      validateStatus: () => true // Don't throw on HTTP error status
    };

    // Add sample data for POST/PUT requests
    if (method === 'POST' || method === 'PUT') {
      config.data = getSampleData(path);
      config.headers = { 'Content-Type': 'application/json' };
    }

    const response = await axios(config);
    const responseTime = Date.now() - startTime;

    return {
      method,
      path,
      description,
      status: response.status,
      responseTime,
      success: response.status < 500, // Consider 4xx as expected for unauthorized requests
      error: response.status >= 500 ? response.statusText : null
    };
  } catch (error) {
    return {
      method,
      path,
      description,
      status: 0,
      responseTime: 0,
      success: false,
      error: error.code === 'ECONNREFUSED' ? 'Server not running' : error.message
    };
  }
}

function getSampleData(path) {
  // Return appropriate sample data based on the endpoint
  if (path.includes('/auth/login')) {
    return { email: 'test@example.com', password: 'testpass123' };
  }
  if (path.includes('/auth/register')) {
    return { 
      email: 'test@example.com', 
      password: 'testpass123', 
      fullName: 'Test User',
      role: 'CONSUMER' 
    };
  }
  if (path.includes('/categories') && !path.includes('/categories/')) {
    return { name: 'Test Category', description: 'Test description', isActive: true };
  }
  if (path.includes('/orders') && !path.includes('/orders/')) {
    return {
      customerId: 1,
      merchantId: 2,
      orderType: 'COMMODITY',
      totalAmount: 25000,
      deliveryAddress: '123 Test Street'
    };
  }
  if (path.includes('/support/tickets') && !path.includes('/tickets/')) {
    return {
      subject: 'Test Issue',
      message: 'Test support message',
      priority: 'NORMAL'
    };
  }
  
  // Default sample data
  return { test: true, timestamp: Date.now() };
}

async function runValidation() {
  console.log('🔍 BrillPrime API Endpoints Validation');
  console.log('=====================================\n');

  const results = {};
  let totalEndpoints = 0;
  let successfulEndpoints = 0;
  let serverRunning = true;

  for (const [category, endpoints] of Object.entries(ENDPOINTS)) {
    console.log(`📂 Testing ${category} endpoints...`);
    
    const categoryResults = [];
    
    for (const endpoint of endpoints) {
      const result = await validateEndpoint(endpoint.method, endpoint.path, endpoint.description);
      categoryResults.push(result);
      totalEndpoints++;
      
      if (result.success) {
        successfulEndpoints++;
        console.log(`   ✅ ${endpoint.method} ${endpoint.path} (${result.status}) - ${result.responseTime}ms`);
      } else {
        console.log(`   ❌ ${endpoint.method} ${endpoint.path} - ${result.error || result.status}`);
        if (result.error === 'Server not running') {
          serverRunning = false;
        }
      }
    }
    
    results[category] = categoryResults;
    console.log('');
  }

  // Print summary
  console.log('📊 VALIDATION SUMMARY');
  console.log('====================');
  console.log(`Server Status: ${serverRunning ? '🟢 Running' : '🔴 Not Running'}`);
  console.log(`Total Endpoints: ${totalEndpoints}`);
  console.log(`Successful: ${successfulEndpoints}`);
  console.log(`Failed: ${totalEndpoints - successfulEndpoints}`);
  console.log(`Success Rate: ${((successfulEndpoints / totalEndpoints) * 100).toFixed(1)}%`);

  // Save detailed results to file
  const reportFile = 'endpoint-validation-report.json';
  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    serverRunning,
    summary: {
      total: totalEndpoints,
      successful: successfulEndpoints,
      failed: totalEndpoints - successfulEndpoints,
      successRate: (successfulEndpoints / totalEndpoints) * 100
    },
    results
  }, null, 2));

  console.log(`\n📄 Detailed report saved to: ${reportFile}`);

  if (!serverRunning) {
    console.log('\n💡 Server is not running. Start it with: npm run dev');
  }
}

// Run validation
if (require.main === module) {
  runValidation().catch(console.error);
}

module.exports = { validateEndpoint, ENDPOINTS };
