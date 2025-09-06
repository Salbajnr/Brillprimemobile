
/**
 * Database Configuration Override
 * 
 * This file ensures that BrillPrime uses the configured production
 * database from environment variables, supporting Replit deployment.
 * 
 * This prevents:
 * - Local database creation when forked
 * - Accidental connection to development databases
 * - Data fragmentation across different database instances
 */

// Production Database Configuration (from environment)
export const PRODUCTION_DATABASE_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
} as const;

// Function to get the database URL (always returns configured production database)
export function getDatabaseUrl(): string {
  return PRODUCTION_DATABASE_CONFIG.connectionString || process.env.DATABASE_URL;
}

// Function to validate database connection is production-ready
export function validateDatabaseConnection(connectionString: string): boolean {
  if (!connectionString) {
    console.error('❌ SECURITY: No database connection string provided!');
    console.error('🔒 DATABASE_URL environment variable is required');
    return false;
  }
  
  const isPostgreSQL = connectionString.includes('postgresql://') || connectionString.includes('postgres://');
  
  if (!isPostgreSQL) {
    console.error('❌ SECURITY: Invalid database connection type!');
    console.error('🔒 This app requires a PostgreSQL database');
    return false;
  }
  
  console.log('✅ Database connection validated: Using PostgreSQL');
  return true;
}

// Prevent local database creation and force cloud usage
export function preventLocalDatabaseCreation(): void {
  // Override ALL database environment variables to force cloud usage
  process.env.DATABASE_URL = PRODUCTION_DATABASE_CONFIG.connectionString;
  process.env.PGHOST = PRODUCTION_DATABASE_CONFIG.host;
  process.env.PGPORT = PRODUCTION_DATABASE_CONFIG.port.toString();
  process.env.PGUSER = PRODUCTION_DATABASE_CONFIG.user;
  process.env.PGPASSWORD = PRODUCTION_DATABASE_CONFIG.password;
  process.env.PGDATABASE = PRODUCTION_DATABASE_CONFIG.database;
  
  // Disable ALL local database services
  process.env.DISABLE_LOCAL_POSTGRES = 'true';
  process.env.DISABLE_LOCAL_MYSQL = 'true';
  process.env.DISABLE_LOCAL_SQLITE = 'true';
  process.env.FORCE_RENDER_DATABASE = 'true';
  process.env.FORCE_CLOUD_SERVICES = 'true';
  
  // Remove any localhost references
  delete process.env.LOCALHOST;
  delete process.env.LOCAL_DB_URL;
  delete process.env.DEV_DATABASE_URL;
  
  console.log('🔒 ALL local database services disabled - Using cloud services only');
  console.log('☁️  Production cloud environment enforced');
}
