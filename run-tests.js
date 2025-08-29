#!/usr/bin/env node

const { spawn } = require('child_process');
const colors = require('colors'); // Import colors for enhanced logging
const fs = require('fs'); // Keep fs import from original
const path = require('path'); // Keep path import from original

let serverProcess = null;
let testResults = {
  server: { status: 'pending', details: [] },
  endpoints: { status: 'pending', details: [] },
  integrations: { status: 'pending', details: [] }
};

async function runTests() {
  try {
    console.log('🚀 Starting BrillPrime Test Suite'.cyan.bold); // Updated log message with color
    console.log('===================================\n'); // Updated separator

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
    console.error('❌ Test suite failed:', error.message); // Updated log message
  } finally {
    // Cleanup
    if (serverProcess) {
      console.log('\n🧹 Cleaning up server process...');
      serverProcess.kill();
    }
  }
}

async function checkAndStartServer() {
  console.log('🚀 Starting development server...'); // Updated log message

  return new Promise((resolve, reject) => {
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, REDIS_DISABLED: 'true' } // Keep env modification
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      // Modified condition to detect server start more reliably
      if (output.includes('Server running') || output.includes('Local:')) {
        testResults.server.status = 'started';
        console.log('✅ Server started successfully'); // Updated log message
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      // Updated error detection for startup issues
      if (error.includes('EADDRINUSE') || error.includes('Error:')) {
        testResults.server.status = 'failed';
        testResults.server.details.push(error);
        reject(new Error(`Server startup failed: ${error}`)); // Updated error message
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (testResults.server.status === 'pending') {
        reject(new Error('Server startup timeout')); // Updated timeout error message
      }
    }, 30000);
  });
}

async function waitForServer() {
  console.log('⏳ Waiting for server to be ready...'); // Updated log message

  for (let i = 0; i < 30; i++) {
    try {
      // Using fetch API instead of http/https modules for simplicity and modern approach
      const response = await fetch('http://0.0.0.0:5000/api/health');
      if (response.ok) {
        console.log('✅ Server is ready'); // Updated log message
        return;
      }
    } catch (error) {
      // Server not ready yet, continue loop
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced wait time for faster feedback
  }

  throw new Error('Server not ready after 30 seconds'); // Updated error message
}

async function runEndpointTests() {
  console.log('\n🧪 Running endpoint tests...'); // Updated log message

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
        console.log('✅ Endpoint tests completed'); // Updated log message
      } else {
        testResults.endpoints.status = 'failed';
        console.log('❌ Some endpoint tests failed'); // Updated log message
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
  console.log('\n🔗 Running integration tests...'); // Updated log message

  return new Promise((resolve) => {
    const testProcess = spawn('node', ['test-integrations.js'], {
      stdio: 'pipe'
    });

    let output = '';

    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    testProcess.on('close', (code) => {
      // Simplified status update, assuming 'completed' regardless of code for now,
      // but ideally this should differentiate pass/fail.
      testResults.integrations.status = code === 0 ? 'completed' : 'failed';
      testResults.integrations.details = output.split('\n').filter(line => line.trim());
      console.log('✅ Integration tests completed'); // Updated log message
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
  console.log('\n📊 Test Results Summary'.cyan.bold); // Updated log message with color
  console.log('======================'); // Updated separator

  // Simplified display for server, endpoints, and integrations status using emojis
  const serverStatus = testResults.server.status === 'started' ? '✅' : '❌';
  const endpointStatus = testResults.endpoints.status === 'passed' ? '✅' : '❌';
  const integrationStatus = testResults.integrations.status === 'completed' ? '✅' : '❌';

  console.log(`Server Startup: ${serverStatus} ${testResults.server.status}`);
  console.log(`Endpoint Tests: ${endpointStatus} ${testResults.endpoints.status}`);
  console.log(`Integration Tests: ${integrationStatus} ${testResults.integrations.status}`);

  // Simplified overall status check
  const allPassed = testResults.server.status === 'started' &&
                   testResults.endpoints.status === 'passed' &&
                   testResults.integrations.status === 'completed';

  if (allPassed) {
    console.log('\n🎉 All tests completed successfully! Your API is ready.'); // Updated success message
  } else {
    console.log('\n⚠️  Some tests had issues. Check the details above.'); // Updated failure message
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };