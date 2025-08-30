
/**
 * Cloud Configuration Enforcer
 * 
 * This module ensures that BrillPrime runs ONLY in cloud/production mode
 * and prevents any local development configurations from being used.
 */

export function enforceCloudConfiguration(): void {
  console.log('☁️  Enforcing cloud-only configuration...');
  
  // Remove all localhost and local development references
  const localVarsToRemove = [
    'LOCALHOST',
    'LOCAL_HOST',
    'LOCAL_DB_URL',
    'DEV_DATABASE_URL',
    'DEVELOPMENT_DB',
    'LOCAL_REDIS_URL',
    'LOCAL_SMTP_HOST',
    'DEV_FRONTEND_URL'
  ];
  
  localVarsToRemove.forEach(varName => {
    if (process.env[varName]) {
      delete process.env[varName];
      console.log(`🚫 Removed local variable: ${varName}`);
    }
  });
  
  // Force production URLs - Auto-detect platform
  const isRender = process.env.RENDER || process.env.RENDER_SERVICE_NAME;
  
  const productionOverrides = {
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
    FRONTEND_URL: isRender ? 'https://brillprime-backend.onrender.com' : 'https://brillprime-frontend.replit.app',
    CLIENT_URL: isRender ? 'https://brillprime-backend.onrender.com' : 'https://brillprime-backend.replit.app',
    BASE_URL: isRender ? 'https://brillprime-backend.onrender.com' : 'https://brillprime-backend.replit.app',
    WEBSOCKET_URL: isRender ? 'wss://brillprime-backend.onrender.com' : 'wss://brillprime-backend.replit.app',
    CORS_ORIGIN: isRender ? 'https://brillprime-backend.onrender.com' : 'https://brillprime-frontend.replit.app,https://brillprime.replit.app',
    TRUSTED_PROXIES: isRender ? 'render' : 'replit,cloudflare'
  };
  
  Object.entries(productionOverrides).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  // Validate cloud services are configured
  const requiredCloudServices = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET'
  ];
  
  const missingServices = requiredCloudServices.filter(service => !process.env[service]);
  
  if (missingServices.length > 0) {
    console.error('❌ Missing required cloud services:');
    missingServices.forEach(service => console.error(`   - ${service}`));
    console.error('🚀 Please configure all required services for production deployment');
  } else {
    console.log('✅ All required cloud services configured');
  }
  
  console.log('☁️  Cloud configuration enforcement complete');
}

export function validateProductionEnvironment(): boolean {
  const checks = [
    {
      name: 'Database Cloud Connection',
      test: () => process.env.DATABASE_URL?.includes('render.com') || process.env.DATABASE_URL?.includes('cloud'),
      required: true
    },
    {
      name: 'Production Node Environment',
      test: () => process.env.NODE_ENV === 'production',
      required: true
    },
    {
      name: 'Cloud Frontend URL',
      test: () => process.env.FRONTEND_URL?.includes('onrender.com') || 
                  process.env.FRONTEND_URL?.includes('replit.app') || 
                  process.env.FRONTEND_URL?.includes('vercel.app') ||
                  process.env.FRONTEND_URL?.includes('render.com'),
      required: true
    },
    {
      name: 'No Local References',
      test: () => !process.env.DATABASE_URL?.includes('localhost') && !process.env.FRONTEND_URL?.includes('localhost'),
      required: true
    }
  ];
  
  console.log('🔍 Validating production environment...');
  
  let allPassed = true;
  checks.forEach(check => {
    const passed = check.test();
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${check.name}: ${passed ? 'PASS' : 'FAIL'}`);
    
    if (!passed && check.required) {
      allPassed = false;
    }
  });
  
  if (allPassed) {
    console.log('✅ Production environment validation passed');
  } else {
    console.error('❌ Production environment validation failed');
    console.error('🚀 Please fix the above issues before deploying');
  }
  
  return allPassed;
}
