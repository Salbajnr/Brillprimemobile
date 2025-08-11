
// Test script to verify all integrations
const { paystackService } = require('./server/services/paystack');

console.log('🔍 Testing Integrations...\n');

// Test Paystack
console.log('💳 Paystack:', paystackService.isConfigured() ? '✅ Configured' : '❌ Missing keys');

// Test Google Maps
console.log('🗺️  Google Maps:', process.env.VITE_GOOGLE_MAPS_API_KEY ? '✅ Configured' : '❌ Missing API key');

// Test Social Auth
console.log('👤 Google OAuth:', process.env.VITE_GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Missing client ID');
console.log('🍎 Apple Sign-In:', process.env.VITE_APPLE_CLIENT_ID ? '✅ Configured' : '❌ Missing client ID');
console.log('📘 Facebook Login:', process.env.VITE_FACEBOOK_APP_ID ? '✅ Configured' : '❌ Missing app ID');

// Test Communication
console.log('📧 Email Service:', process.env.SENDGRID_API_KEY || process.env.EMAIL_USER ? '✅ Configured' : '❌ Missing email config');
console.log('📱 SMS Service:', process.env.TWILIO_ACCOUNT_SID || process.env.TERMII_API_KEY ? '✅ Configured' : '❌ Missing SMS config');

console.log('\n✨ Run this script to verify your setup before deployment!');
