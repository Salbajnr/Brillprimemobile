import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file but preserve system environment variables (Replit compatibility)
dotenv.config({ path: '.env', override: false });

const envSchema = z.object({
  // Core Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('0.0.0.0'),

  // Database Configuration
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  PGHOST: z.string().optional(),
  PGPORT: z.coerce.number().optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGDATABASE: z.string().optional(),

  // Redis Configuration
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DISABLED: z.coerce.boolean().default(false),

  // Security Secrets
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters').optional(),

  // URLs and Origins
  FRONTEND_URL: z.string().url().default('https://brillprime-frontend.replit.app'),
  WEBSOCKET_URL: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  TRUSTED_PROXIES: z.string().optional(),

  // Payment Processing
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLIC_KEY: z.string().optional(),

  // External Services
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),

  // File Storage
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET_NAME: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(5),
  PAYMENT_RATE_LIMIT_MAX: z.coerce.number().default(10),

  // Security Configuration
  HELMET_CSP_ENABLED: z.coerce.boolean().default(true),

  // Feature Flags
  ENABLE_ANALYTICS: z.coerce.boolean().default(true),
  ENABLE_PUSH_NOTIFICATIONS: z.coerce.boolean().default(false),
  ENABLE_SMS_VERIFICATION: z.coerce.boolean().default(false),
  ENABLE_EMAIL_VERIFICATION: z.coerce.boolean().default(false),
  ENABLE_BIOMETRIC_AUTH: z.coerce.boolean().default(false),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  METRICS_ENABLED: z.coerce.boolean().default(true),

  // App Configuration
  APP_NAME: z.string().default('Brill Prime'),
  APP_URL: z.string().url().optional(),
  SUPPORT_EMAIL: z.string().email().optional()
});

export function validateEnvironment() {
  try {
    const env = envSchema.parse(process.env);

    // Additional production validation
    if (env.NODE_ENV === 'production') {
      validateProductionRequirements(env);
    }

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });

      // In development, provide helpful message but don't exit
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️  Some environment variables are missing. Using defaults where possible.');
        console.warn('⚠️  Some environment variables are missing. Using defaults where possible.');
        console.warn('💡 For production deployment, ensure all required variables are set');

        // Only exit in production
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ Missing required environment variables for production deployment');
          process.exit(1);
        }
      } else {
        console.error('❌ Production environment validation failed. Exiting...');
        process.exit(1);
      }
    }
    process.exit(1);
  }
}

function validateProductionRequirements(env: any) {
  const requiredForProduction = [
    { key: 'PAYSTACK_SECRET_KEY', message: 'Payment processing requires Paystack configuration' },
    { key: 'ENCRYPTION_KEY', message: 'Production requires encryption key for sensitive data' },
    { key: 'CORS_ORIGIN', message: 'Production requires specific CORS origins' },
    { key: 'APP_URL', message: 'Production requires app URL configuration' }
  ];

  const warnings: string[] = [];
  const errors: string[] = [];

  for (const requirement of requiredForProduction) {
    if (!env[requirement.key]) {
      if (['ENCRYPTION_KEY', 'CORS_ORIGIN'].includes(requirement.key)) {
        errors.push(requirement.message);
      } else {
        warnings.push(requirement.message);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('Production warnings:');
    warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }

  if (errors.length > 0) {
    console.error('Production errors:');
    errors.forEach(error => console.error(`  ❌ ${error}`));
    throw new Error('Missing required production configuration');
  }
}

export type Environment = z.infer<typeof envSchema>;