
const path = require('path');
const fs = require('fs');

console.log('🔍 Testing API Key Integrations...\n');

// Load environment variables
require('dotenv').config();

// Check if services directory exists
const servicesPath = path.join(__dirname, 'server', 'services');
const paystackServicePath = path.join(servicesPath, 'paystack.ts');

console.log('📁 Checking service files...');
console.log('Services directory exists:', fs.existsSync(servicesPath));
console.log('Paystack service exists:', fs.existsSync(paystackServicePath));

console.log('\n🔑 API Key Status Check:\n');

// Essential Payment Integration
const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
const paystackPublic = process.env.PAYSTACK_PUBLIC_KEY;
console.log('💳 Paystack Payment:');
console.log('  Secret Key:', paystackSecret ? '✅ Configured' : '❌ Missing PAYSTACK_SECRET_KEY');
console.log('  Public Key:', paystackPublic ? '✅ Configured' : '❌ Missing PAYSTACK_PUBLIC_KEY');

// Google Services
const googleMapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
console.log('\n🗺️  Google Services:');
console.log('  Maps API:', googleMapsKey ? '✅ Configured' : '❌ Missing VITE_GOOGLE_MAPS_API_KEY');
console.log('  OAuth Client ID:', googleClientId ? '✅ Configured' : '❌ Missing VITE_GOOGLE_CLIENT_ID');
console.log('  OAuth Secret:', googleClientSecret ? '✅ Configured' : '❌ Missing GOOGLE_CLIENT_SECRET');

// Social Authentication
const appleClientId = process.env.VITE_APPLE_CLIENT_ID;
const facebookAppId = process.env.VITE_FACEBOOK_APP_ID;
console.log('\n👤 Social Authentication:');
console.log('  Apple Sign-In:', appleClientId ? '✅ Configured' : '❌ Missing VITE_APPLE_CLIENT_ID');
console.log('  Facebook Login:', facebookAppId ? '✅ Configured' : '❌ Missing VITE_FACEBOOK_APP_ID');

// Communication Services
const sendgridKey = process.env.SENDGRID_API_KEY;
const emailUser = process.env.EMAIL_USER;
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const termiiKey = process.env.TERMII_API_KEY;
console.log('\n📧 Communication Services:');
console.log('  Email (SendGrid):', sendgridKey ? '✅ Configured' : '❌ Missing SENDGRID_API_KEY');
console.log('  Email (SMTP):', emailUser ? '✅ Configured' : '❌ Missing EMAIL_USER');
console.log('  SMS (Twilio):', twilioSid ? '✅ Configured' : '❌ Missing TWILIO_ACCOUNT_SID');
console.log('  SMS (Termii):', termiiKey ? '✅ Configured' : '❌ Missing TERMII_API_KEY');

// Database & Infrastructure
const databaseUrl = process.env.DATABASE_URL;
const redisDisabled = process.env.REDIS_DISABLED;
console.log('\n🗄️  Infrastructure:');
console.log('  Database:', databaseUrl ? '✅ Configured' : '❌ Missing DATABASE_URL');
console.log('  Redis:', redisDisabled === 'true' ? '⚠️  Disabled (OK for development)' : '❓ Status unknown');

// Summary
console.log('\n📊 Integration Summary:');
const criticalServices = [paystackSecret, paystackPublic, googleMapsKey, databaseUrl];
const criticalCount = criticalServices.filter(Boolean).length;
const socialServices = [googleClientId, appleClientId, facebookAppId];
const socialCount = socialServices.filter(Boolean).length;
const commServices = [sendgridKey || emailUser, twilioSid || termiiKey];
const commCount = commServices.filter(Boolean).length;

console.log(`  Critical Services: ${criticalCount}/4 configured`);
console.log(`  Social Auth: ${socialCount}/3 configured`);
console.log(`  Communication: ${commCount}/2 configured`);

if (criticalCount === 4) {
  console.log('\n✅ Your app is ready for basic deployment!');
} else {
  console.log('\n⚠️  Add missing critical API keys before deployment.');
}

console.log('\n🚀 Next steps:');
console.log('1. Add missing API keys to Replit Secrets');
console.log('2. Test each integration individually');
console.log('3. Deploy with confidence!');
