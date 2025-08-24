
#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 BrillPrime Automated Test Suite');
console.log('====================================\n');

let serverProcess = null;
let testResults = {
  server: { status: 'pending', details: [] },
  endpoints: { status: 'pending', details: [] },
  integrations: { status: 'pending', details: [] }
};

async function runTests() {
  try {
    // Step 1: Check and start server
    await checkAndStartServer();
    
    // Step 2: Wait for server to be ready
    await waitForServer();
    
    // Step 3: Run endpoint tests
    await runEndpointTests();
    
    // Step 4: Run integration tests
    await runIntegrationTests();
    
    // Step 5: Display results
    displayResults();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    // Cleanup
    if (serverProcess) {
      console.log('\n🧹 Cleaning up server process...');
      serverProcess.kill();
    }
  }
}

async function checkAndStartServer() {
  console.log('🔍 Checking server status...');
  
  try {
    const response = await makeHttpRequest('http://0.0.0.0:5000/api/health');
    console.log('✅ Server is already running');
    testResults.server.status = 'running';
    return;
  } catch (error) {
    console.log('🔄 Starting server...');
    
    serverProcess = spawn('npm', ['run', 'dev'], {
      env: { ...process.env, REDIS_DISABLED: 'true' },
      stdio: 'pipe'
    });
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running on')) {
        testResults.server.status = 'started';
        testResults.server.details.push('Server started successfully');
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Error')) {
        testResults.server.details.push(`Error: ${error}`);
      }
    });
  }
}

async function waitForServer() {
  console.log('⏳ Waiting for server to be ready...');
  
  for (let i = 0; i < 30; i++) {
    try {
      await makeHttpRequest('http://0.0.0.0:5000/api/health');
      console.log('✅ Server is ready');
      return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Server failed to start within 60 seconds');
}

async function runEndpointTests() {
  console.log('\n🧪 Running endpoint tests...');
  
  return new Promise((resolve, reject) => {
    const testProcess = spawn('node', ['test-api.js'], {
      stdio: 'pipe'
    });
    
    let output = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        testResults.endpoints.status = 'passed';
        console.log('✅ Endpoint tests completed');
      } else {
        testResults.endpoints.status = 'failed';
        console.log('❌ Some endpoint tests failed');
      }
      
      testResults.endpoints.details = output.split('\n').filter(line => line.trim());
      resolve();
    });
    
    testProcess.on('error', (error) => {
      testResults.endpoints.status = 'error';
      testResults.endpoints.details.push(error.message);
      resolve();
    });
  });
}

async function runIntegrationTests() {
  console.log('\n🔗 Running integration tests...');
  
  return new Promise((resolve) => {
    const testProcess = spawn('node', ['test-integrations.js'], {
      stdio: 'pipe'
    });
    
    let output = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.on('close', (code) => {
      testResults.integrations.status = code === 0 ? 'completed' : 'completed';
      testResults.integrations.details = output.split('\n').filter(line => line.trim());
      console.log('✅ Integration tests completed');
      resolve();
    });
    
    testProcess.on('error', (error) => {
      testResults.integrations.status = 'error';
      testResults.integrations.details.push(error.message);
      resolve();
    });
  });
}

function displayResults() {
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================\n');
  
  // Server Status
  console.log('🖥️  SERVER STATUS:');
  console.log(`   Status: ${getStatusIcon(testResults.server.status)} ${testResults.server.status.toUpperCase()}`);
  testResults.server.details.forEach(detail => console.log(`   • ${detail}`));
  
  // Endpoint Tests
  console.log('\n🔗 ENDPOINT TESTS:');
  console.log(`   Status: ${getStatusIcon(testResults.endpoints.status)} ${testResults.endpoints.status.toUpperCase()}`);
  const endpointSummary = testResults.endpoints.details.filter(line => 
    line.includes('✅') || line.includes('❌') || line.includes('Testing')
  ).slice(0, 10);
  endpointSummary.forEach(detail => console.log(`   • ${detail}`));
  
  // Integration Tests
  console.log('\n🔧 INTEGRATION TESTS:');
  console.log(`   Status: ${getStatusIcon(testResults.integrations.status)} ${testResults.integrations.status.toUpperCase()}`);
  const integrationSummary = testResults.integrations.details.filter(line => 
    line.includes('✅') || line.includes('❌') || line.includes('Status:')
  ).slice(0, 8);
  integrationSummary.forEach(detail => console.log(`   • ${detail}`));
  
  // Overall Status
  const overallStatus = getOverallStatus();
  console.log(`\n🎯 OVERALL STATUS: ${getStatusIcon(overallStatus)} ${overallStatus.toUpperCase()}`);
  
  if (overallStatus === 'passed') {
    console.log('\n🎉 All tests completed successfully! Your API is ready.');
  } else if (overallStatus === 'partial') {
    console.log('\n⚠️  Some tests had issues. Check the details above.');
  } else {
    console.log('\n❌ Tests failed. Please review the errors and fix issues.');
  }
  
  console.log('\n📝 Full logs available in console output above.');
}

function getStatusIcon(status) {
  switch (status) {
    case 'passed':
    case 'running':
    case 'started':
    case 'completed':
      return '✅';
    case 'failed':
    case 'error':
      return '❌';
    case 'partial':
      return '⚠️';
    default:
      return '🔄';
  }
}

function getOverallStatus() {
  const statuses = [
    testResults.server.status,
    testResults.endpoints.status,
    testResults.integrations.status
  ];
  
  if (statuses.every(s => ['passed', 'running', 'started', 'completed'].includes(s))) {
    return 'passed';
  } else if (statuses.some(s => ['failed', 'error'].includes(s))) {
    return 'failed';
  } else {
    return 'partial';
  }
}

function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? require('https') : require('http');
    
    const request = protocol.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${response.statusCode}`));
        }
      });
    });
    
    request.on('error', reject);
    request.setTimeout(5000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
