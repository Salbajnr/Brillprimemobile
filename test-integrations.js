
// Simple API Key Integration Test
console.log('🔍 BrillPrime API Integration Status\n');

// Check environment variables directly from process.env
const envVars = {
  // Critical Services
  'PAYSTACK_SECRET_KEY': process.env.PAYSTACK_SECRET_KEY,
  'PAYSTACK_PUBLIC_KEY': process.env.PAYSTACK_PUBLIC_KEY,
  'DATABASE_URL': process.env.DATABASE_URL,
  
  // Google Services  
  'VITE_GOOGLE_MAPS_API_KEY': process.env.VITE_GOOGLE_MAPS_API_KEY,
  'VITE_GOOGLE_CLIENT_ID': process.env.VITE_GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
  
  // Social Auth
  'VITE_APPLE_CLIENT_ID': process.env.VITE_APPLE_CLIENT_ID,
  'VITE_FACEBOOK_APP_ID': process.env.VITE_FACEBOOK_APP_ID,
  
  // Communication
  'SENDGRID_API_KEY': process.env.SENDGRID_API_KEY,
  'EMAIL_USER': process.env.EMAIL_USER,
  'TWILIO_ACCOUNT_SID': process.env.TWILIO_ACCOUNT_SID,
  'TERMII_API_KEY': process.env.TERMII_API_KEY,
  
  // Security
  'JWT_SECRET': process.env.JWT_SECRET,
  'SESSION_SECRET': process.env.SESSION_SECRET
};

console.log('🔑 API Key Status:\n');

// Critical Services
console.log('💳 Payment Processing:');
console.log(`  Paystack Secret: ${envVars.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`  Paystack Public: ${envVars.PAYSTACK_PUBLIC_KEY ? '✅ Set' : '❌ Missing'}`);

console.log('\n🗺️  Location Services:');
console.log(`  Google Maps: ${envVars.VITE_GOOGLE_MAPS_API_KEY ? '✅ Set' : '❌ Missing'}`);

console.log('\n👤 Authentication:');
console.log(`  Google OAuth: ${envVars.VITE_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`  Apple Sign-In: ${envVars.VITE_APPLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`  Facebook Login: ${envVars.VITE_FACEBOOK_APP_ID ? '✅ Set' : '❌ Missing'}`);

console.log('\n📧 Communication:');
console.log(`  Email Service: ${envVars.SENDGRID_API_KEY || envVars.EMAIL_USER ? '✅ Set' : '❌ Missing'}`);
console.log(`  SMS Service: ${envVars.TWILIO_ACCOUNT_SID || envVars.TERMII_API_KEY ? '✅ Set' : '❌ Missing'}`);

console.log('\n🗄️  Infrastructure:');
console.log(`  Database: ${envVars.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`  JWT Secret: ${envVars.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);

// Calculate readiness score
const criticalKeys = [
  envVars.PAYSTACK_SECRET_KEY,
  envVars.PAYSTACK_PUBLIC_KEY, 
  envVars.VITE_GOOGLE_MAPS_API_KEY,
  envVars.DATABASE_URL,
  envVars.JWT_SECRET
];

const configuredCritical = criticalKeys.filter(Boolean).length;
const totalCritical = criticalKeys.length;

console.log('\n📊 Deployment Readiness:');
console.log(`  Critical APIs: ${configuredCritical}/${totalCritical} configured`);

if (configuredCritical >= 4) {
  console.log('  Status: ✅ Ready for deployment!');
} else if (configuredCritical >= 2) {
  console.log('  Status: ⚠️  Partially ready - add missing keys');
} else {
  console.log('  Status: ❌ Not ready - configure API keys first');
}

console.log('\n🎯 Next Steps:');
if (configuredCritical < totalCritical) {
  console.log('1. Use Replit Secrets to add missing API keys');
  console.log('2. Get API keys from respective service providers');
  console.log('3. Test integrations individually');
}
console.log('4. Deploy to Replit when ready!');

console.log('\n🔧 Quick Setup Guide:');
console.log('• Paystack: https://dashboard.paystack.com/settings/api');
console.log('• Google Maps: https://console.cloud.google.com/apis/credentials');
console.log('• Google OAuth: https://console.cloud.google.com/apis/credentials');
