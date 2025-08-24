
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

const ENDPOINTS = [
  // Health Check
  { method: 'GET', path: '/health', description: 'Health check' },
  
  // Categories
  { method: 'GET', path: '/categories', description: 'Get categories' },
  
  // Orders
  { method: 'GET', path: '/orders', description: 'Get orders' },
  
  // Analytics
  { method: 'GET', path: '/analytics/dashboard', description: 'Dashboard analytics' },
  { method: 'GET', path: '/analytics/real-time', description: 'Real-time metrics' },
  
  // Driver
  { method: 'GET', path: '/driver/dashboard', description: 'Driver dashboard' },
  
  // Auth
  { method: 'GET', path: '/auth/session', description: 'Check session' }
];

async function testEndpoint(endpoint) {
  try {
    const response = await axios({
      method: endpoint.method,
      url: `${BASE_URL}${endpoint.path}`,
      timeout: 5000,
      validateStatus: () => true // Don't throw on any status
    });

    return {
      ...endpoint,
      status: response.status,
      success: response.status < 500,
      error: response.status >= 500 ? response.data : null
    };
  } catch (error) {
    return {
      ...endpoint,
      status: 'ERROR',
      success: false,
      error: error.message
    };
  }
}

async function testAllEndpoints() {
  console.log('🚀 Testing all endpoints...\n');
  
  const results = [];
  
  for (const endpoint of ENDPOINTS) {
    console.log(`Testing ${endpoint.method} ${endpoint.path}...`);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.status} - ${result.description}`);
  }
  
  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`✅ ${successful}/${total} endpoints working`);
  
  if (successful < total) {
    console.log('\n❌ Failed endpoints:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ${r.method} ${r.path} - ${r.status}`);
    });
  }
}

// Wait for server to start, then test
setTimeout(testAllEndpoints, 3000);
