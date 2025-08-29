
/**
 * Database Configuration Override
 * 
 * This file ensures that BrillPrime ALWAYS connects to the production
 * Render PostgreSQL database, regardless of environment or fork status.
 * 
 * This prevents:
 * - Local database creation when forked
 * - Accidental connection to development databases
 * - Data fragmentation across different database instances
 */

// Production Render PostgreSQL Database (Read-Only Configuration)
export const PRODUCTION_DATABASE_CONFIG = {
  connectionString: 'postgresql://brillprimemobiledb_user:ymhSFdyAdL7cRbCzJwUgjXwEufSsTh89@dpg-d2npgb6r433s73ah5qqg-a.oregon-postgres.render.com:5432/brillprimemobiledb',
  host: 'dpg-d2npgb6r433s73ah5qqg-a.oregon-postgres.render.com',
  port: 5432,
  user: 'brillprimemobiledb_user',
  password: 'ymhSFdyAdL7cRbCzJwUgjXwEufSsTh89',
  database: 'brillprimemobiledb',
  ssl: {
    rejectUnauthorized: false
  }
} as const;

// Function to get the database URL (always returns Render database)
export function getDatabaseUrl(): string {
  return PRODUCTION_DATABASE_CONFIG.connectionString;
}

// Function to validate database connection is to Render
export function validateDatabaseConnection(connectionString: string): boolean {
  const isRenderDatabase = connectionString.includes('dpg-d2npgb6r433s73ah5qqg-a.oregon-postgres.render.com');
  
  if (!isRenderDatabase) {
    console.error('❌ SECURITY: Attempted connection to non-Render database blocked!');
    console.error('🔒 This app is configured to only use the production Render database');
    return false;
  }
  
  console.log('✅ Database connection validated: Using Render PostgreSQL');
  return true;
}

// Prevent local database creation
export function preventLocalDatabaseCreation(): void {
  // Override common local database environment variables
  process.env.DATABASE_URL = PRODUCTION_DATABASE_CONFIG.connectionString;
  process.env.PGHOST = PRODUCTION_DATABASE_CONFIG.host;
  process.env.PGPORT = PRODUCTION_DATABASE_CONFIG.port.toString();
  process.env.PGUSER = PRODUCTION_DATABASE_CONFIG.user;
  process.env.PGPASSWORD = PRODUCTION_DATABASE_CONFIG.password;
  process.env.PGDATABASE = PRODUCTION_DATABASE_CONFIG.database;
  
  // Disable local PostgreSQL if it exists
  process.env.DISABLE_LOCAL_POSTGRES = 'true';
  process.env.FORCE_RENDER_DATABASE = 'true';
  
  console.log('🔒 Local database creation prevented - Using Render database only');
}
