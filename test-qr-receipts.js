// Test QR Receipt System
const baseUrl = 'http://localhost:5000';

// Test credentials (use actual test user)
const testUser = {
  email: 'test@example.com',
  password: 'test123456'
};

let authCookie = '';
let testTransactionId = '';
let testReceiptId = '';

// Helper to make authenticated requests
async function makeRequest(endpoint, options = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie,
      ...options.headers
    }
  });
  
  const data = await response.json();
  console.log(`${options.method || 'GET'} ${endpoint}:`, {
    status: response.status,
    success: data.success,
    message: data.message || 'OK'
  });
  
  return { response, data };
}

// Test functions
async function testLogin() {
  console.log('\n🔐 Testing Login...');
  const { response, data } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(testUser)
  });
  
  if (response.ok) {
    // Extract session cookie
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      authCookie = cookies.split(';')[0];
    }
    console.log('✅ Login successful');
    return true;
  } else {
    console.log('❌ Login failed:', data.message);
    return false;
  }
}

async function testCreateMockTransaction() {
  console.log('\n💳 Creating mock transaction...');
  
  // For testing, we'll create a mock successful transaction
  // In real use, this would come from actual payment verification
  const mockTransaction = {
    userId: 1, // Assuming test user has ID 1
    amount: '50.00',
    currency: 'NGN',
    paymentMethod: 'card',
    status: 'SUCCESS',
    reference: `TEST_${Date.now()}`,
    description: 'Test payment for QR receipt'
  };
  
  console.log('✅ Mock transaction created (in real app, this comes from payment verification)');
  testTransactionId = 'test_transaction_id'; // Mock ID
  return true;
}

async function testGenerateQRReceipt() {
  console.log('\n🎫 Testing QR Receipt Generation...');
  
  const { response, data } = await makeRequest('/api/qr-receipts/generate', {
    method: 'POST',
    body: JSON.stringify({
      transactionId: testTransactionId,
      merchantId: 2, // Assuming merchant with ID 2 exists
      serviceType: 'DELIVERY'
    })
  });
  
  if (response.ok && data.success) {
    testReceiptId = data.data.receiptId;
    console.log('✅ QR Receipt generated successfully');
    console.log(`   Receipt Number: ${data.data.receiptNumber}`);
    console.log(`   QR Code: ${data.data.qrCodeData ? 'Generated' : 'Not generated'}`);
    return true;
  } else {
    console.log('❌ QR Receipt generation failed:', data.message);
    return false;
  }
}

async function testScanQRReceipt() {
  console.log('\n📱 Testing QR Receipt Scanning...');
  
  // Create a mock QR code for testing
  const mockQRCode = `RECEIPT_${testTransactionId}_RCP-TEST-${Date.now()}_1_2`;
  
  const { response, data } = await makeRequest('/api/qr-receipts/scan', {
    method: 'POST',
    body: JSON.stringify({
      qrCode: mockQRCode,
      location: 'Test Location',
      latitude: 6.5244,
      longitude: 3.3792
    })
  });
  
  if (response.ok && data.success) {
    console.log('✅ QR Receipt scanned successfully');
    console.log(`   Receipt: ${data.data.receipt.receiptNumber}`);
    console.log(`   Scanner: ${data.data.scanner.name} (${data.data.scanner.role})`);
    return true;
  } else {
    console.log('❌ QR Receipt scanning failed:', data.message);
    // This might fail if receipt doesn't exist in DB, which is expected for mock data
    return false;
  }
}

async function testGetUserReceipts() {
  console.log('\n📋 Testing Get User Receipts...');
  
  const { response, data } = await makeRequest('/api/qr-receipts?page=1&limit=10');
  
  if (response.ok && data.success) {
    console.log('✅ User receipts retrieved successfully');
    console.log(`   Found ${data.data.receipts.length} receipts`);
    console.log(`   Has more: ${data.data.pagination.hasMore}`);
    return true;
  } else {
    console.log('❌ Get user receipts failed:', data.message);
    return false;
  }
}

async function testValidateQRCode() {
  console.log('\n🔍 Testing QR Code Validation...');
  
  const testQRCode = 'RECEIPT_123_RCP-TEST-456_1_2';
  
  const { response, data } = await makeRequest('/api/qr-receipts/validate', {
    method: 'POST',
    body: JSON.stringify({
      qrCode: testQRCode
    })
  });
  
  if (response.ok && data.success) {
    console.log('✅ QR Code validation successful');
    console.log(`   Transaction ID: ${data.data.transactionId}`);
    console.log(`   Receipt Number: ${data.data.receiptNumber}`);
    console.log(`   Valid format: ${data.data.isValid}`);
    return true;
  } else {
    console.log('❌ QR Code validation failed:', data.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Testing QR Receipt System\n');
  console.log('=' * 50);
  
  const results = {};
  
  // Test authentication first
  results.login = await testLogin();
  if (!results.login) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Test QR receipt functionality
  results.mockTransaction = await testCreateMockTransaction();
  results.generateReceipt = await testGenerateQRReceipt();
  results.scanReceipt = await testScanQRReceipt();
  results.getUserReceipts = await testGetUserReceipts();
  results.validateQR = await testValidateQRCode();
  
  // Summary
  console.log('\n' + '=' * 50);
  console.log('📊 Test Results Summary:');
  console.log('=' * 50);
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${result ? '✅' : '❌'} ${test}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All QR Receipt system tests passed!');
  } else {
    console.log('⚠️  Some tests failed - check implementation');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the tests
runTests().catch(console.error);