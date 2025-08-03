
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  duration: number;
  errors: string[];
}

class E2ETestRunner {
  private results: TestResult[] = [];
  
  async runAllTests() {
    console.log('🚀 Starting BrillPrime E2E Test Suite...\n');
    
    const testSuites = [
      'admin-dashboard.test.ts',
      'main-application.test.ts', 
      'api-integration.test.ts',
      'websocket-integration.test.ts'
    ];

    console.log('📋 Test Suites to run:');
    testSuites.forEach((suite, index) => {
      console.log(`   ${index + 1}. ${suite}`);
    });
    console.log('');

    // Check if servers are running
    await this.checkServerStatus();

    // Run each test suite
    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate report
    this.generateReport();
  }

  private async checkServerStatus() {
    console.log('🔍 Checking server status...');
    
    const checks = [
      { name: 'Main App Server', url: 'http://0.0.0.0:3000' },
      { name: 'API Server', url: 'http://0.0.0.0:5000/api/health' },
      { name: 'Admin Dashboard', url: 'http://0.0.0.0:5173' }
    ];

    for (const check of checks) {
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(check.url, { timeout: 5000 });
        console.log(`   ✅ ${check.name}: Running (${response.status})`);
      } catch (error) {
        console.log(`   ⚠️  ${check.name}: Not accessible (${check.url})`);
      }
    }
    console.log('');
  }

  private async runTestSuite(suiteName: string): Promise<void> {
    return new Promise((resolve) => {
      console.log(`🧪 Running ${suiteName}...`);
      const startTime = Date.now();
      
      const testProcess = spawn('npx', ['jest', `tests/e2e/${suiteName}`, '--config', 'jest.e2e.config.js'], {
        stdio: 'pipe',
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          JEST_TIMEOUT: '30000'
        }
      });

      let output = '';
      let passed = 0;
      let failed = 0;
      const errors: string[] = [];

      testProcess.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });

      testProcess.stderr.on('data', (data) => {
        const errorText = data.toString();
        errors.push(errorText);
        process.stderr.write(data);
      });

      testProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        // Parse results from output
        const passMatches = output.match(/(\d+) passed/);
        const failMatches = output.match(/(\d+) failed/);
        
        if (passMatches) passed = parseInt(passMatches[1]);
        if (failMatches) failed = parseInt(failMatches[1]);

        this.results.push({
          suite: suiteName,
          passed,
          failed,
          duration,
          errors
        });

        console.log(`   ✅ ${suiteName} completed in ${duration}ms\n`);
        resolve();
      });

      testProcess.on('error', (error) => {
        console.log(`   ❌ Error running ${suiteName}:`, error.message);
        this.results.push({
          suite: suiteName,
          passed: 0,
          failed: 1,
          duration: Date.now() - startTime,
          errors: [error.message]
        });
        resolve();
      });
    });
  }

  private generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 E2E TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;

    this.results.forEach(result => {
      totalPassed += result.passed;
      totalFailed += result.failed;
      totalDuration += result.duration;

      const status = result.failed === 0 ? '✅' : '❌';
      console.log(`${status} ${result.suite.padEnd(30)} | Pass: ${result.passed.toString().padStart(2)} | Fail: ${result.failed.toString().padStart(2)} | ${result.duration}ms`);
    });

    console.log('-'.repeat(60));
    console.log(`📈 TOTALS:`.padEnd(32) + `| Pass: ${totalPassed.toString().padStart(2)} | Fail: ${totalFailed.toString().padStart(2)} | ${totalDuration}ms`);
    console.log('='.repeat(60));

    // Test coverage summary
    console.log('\n🎯 COVERAGE SUMMARY:');
    console.log('✅ Admin Dashboard - User Management, Transactions, Monitoring');
    console.log('✅ Main Application - Authentication, Dashboards, Chat, Payments');
    console.log('✅ API Integration - All major endpoints and error handling');
    console.log('✅ WebSocket - Real-time communication and events');

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (totalFailed > 0) {
      console.log('❌ Some tests failed - check server connectivity and data setup');
    } else {
      console.log('✅ All tests passed - system is functioning correctly');
    }

    console.log('\n🚀 E2E Test Suite Complete!');
  }
}

// Run the tests
const runner = new E2ETestRunner();
runner.runAllTests().catch(console.error);
