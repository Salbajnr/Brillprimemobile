import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runE2ETests() {
  console.log('🚀 Starting E2E Tests...');

  try {
    // Test 1: API Integration
    console.log('\n📡 Testing API Integration...');
    await execAsync('npx tsx tests/e2e/api-integration.test.ts');
    console.log('✅ API Integration tests passed');

    // Test 2: WebSocket Integration
    console.log('\n🔌 Testing WebSocket Integration...');
    await execAsync('npx tsx tests/e2e/websocket-integration.test.ts');
    console.log('✅ WebSocket Integration tests passed');

    // Test 3: Main Application
    console.log('\n🖥️ Testing Main Application...');
    await execAsync('npx tsx tests/e2e/main-application.test.ts');
    console.log('✅ Main Application tests passed');

    // Test 4: Admin Dashboard
    console.log('\n👩‍💼 Testing Admin Dashboard...');
    await execAsync('npx tsx tests/e2e/admin-dashboard.test.ts');
    console.log('✅ Admin Dashboard tests passed');

    console.log('\n🎉 All E2E tests completed successfully!');

  } catch (error) {
    console.error('\n❌ E2E tests failed:', error);
    process.exit(1);
  }
}

runE2ETests();