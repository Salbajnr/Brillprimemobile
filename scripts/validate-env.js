
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating environment configuration...\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.error('❌ .env file not found!');
  console.log('📝 Please copy .env.production to .env and configure it.');
  process.exit(1);
}

// Load environment variables
require('dotenv').config();

const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SESSION_SECRET',
  'NODE_ENV'
];

const optionalVars = [
  'REDIS_URL',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_PUBLIC_KEY',
  'VITE_GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SENDGRID_API_KEY',
  'TWILIO_ACCOUNT_SID'
];

let hasErrors = false;

console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ❌ ${varName}: Missing`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${varName}: Set`);
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ⚠️  ${varName}: Not set`);
  } else {
    console.log(`  ✅ ${varName}: Set`);
  }
});

// Validate specific formats
console.log('\n🔍 Format Validation:');

// Database URL
if (process.env.DATABASE_URL) {
  if (process.env.DATABASE_URL.includes('postgresql://')) {
    console.log('  ✅ DATABASE_URL: Valid PostgreSQL format');
  } else {
    console.log('  ❌ DATABASE_URL: Invalid format (should be postgresql://)');
    hasErrors = true;
  }
}

// JWT Secret length
if (process.env.JWT_SECRET) {
  if (process.env.JWT_SECRET.length >= 32) {
    console.log('  ✅ JWT_SECRET: Adequate length');
  } else {
    console.log('  ⚠️  JWT_SECRET: Should be at least 32 characters');
  }
}

// Session Secret length
if (process.env.SESSION_SECRET) {
  if (process.env.SESSION_SECRET.length >= 32) {
    console.log('  ✅ SESSION_SECRET: Adequate length');
  } else {
    console.log('  ⚠️  SESSION_SECRET: Should be at least 32 characters');
  }
}

if (hasErrors) {
  console.log('\n❌ Environment validation failed!');
  console.log('Please fix the missing required variables.');
  process.exit(1);
} else {
  console.log('\n✅ Environment validation passed!');
  console.log('All required variables are properly configured.');
}.log('\n✅ Environment validation passed!');
}
