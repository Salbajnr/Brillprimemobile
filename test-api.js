
const { exec } = require('child_process');

console.log('🧪 BrillPrime API Testing Suite');
console.log('================================\n');

// First, check if server is running
console.log('🔍 Checking if server is running...');

exec('curl -f http://0.0.0.0:5000/api/health 2>/dev/null', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Server is not running. Starting server first...\n');
    
    // Start the server
    const serverProcess = exec('cd server && npm run dev', (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to start server:', error);
        return;
      }
    });
    
    // Wait a bit for server to start, then run tests
    setTimeout(() => {
      runTests();
    }, 5000);
    
  } else {
    console.log('✅ Server is running. Starting tests...\n');
    runTests();
  }
});

function runTests() {
  // Run the TypeScript test file
  exec('cd server && npx tsx test-endpoints.ts', (error, stdout, stderr) => {
    if (error) {
      console.error('Test execution error:', error);
      return;
    }
    
    console.log(stdout);
    
    if (stderr) {
      console.error('Test warnings/errors:', stderr);
    }
  });
}
