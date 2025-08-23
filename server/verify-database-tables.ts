
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function verifyAndCreateMissingTables() {
  console.log('🔍 Verifying database tables...');
  
  try {
    // Check if all required tables exist
    const tableChecks = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = tableChecks.map(row => row.table_name);
    console.log('📋 Existing tables:', existingTables);

    // Define all expected tables from migrations
    const expectedTables = [
      'users', 'identity_verifications', 'orders', 'transactions', 'notifications', 'error_logs',
      'admin_users', 'admin_payment_actions', 'delivery_confirmations', 'content_reports', 
      'moderation_responses', 'vendor_violations', 'compliance_documents', 'escrow_accounts', 
      'payment_distributions', 'fuel_orders', 'fuel_stations', 'escrow_transactions', 'disputes', 
      'escrow_releases', 'fraud_alerts', 'conversations', 'messages', 'location_tracking', 
      'order_status_history', 'realtime_sessions', 'push_subscriptions', 'delivery_tracking', 
      'notification_log', 'toll_gates', 'support_tickets', 'support_responses', 'mfa_tokens', 
      'verification_documents', 'security_logs', 'trusted_devices', 'driver_profiles', 
      'merchant_profiles', 'products', 'vendor_posts'
    ];

    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ All tables exist!');
      return;
    }

    console.log('⚠️ Missing tables:', missingTables);
    console.log('🛠️ Creating missing tables...');

    // Create missing core tables
    if (missingTables.includes('driver_profiles')) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS driver_profiles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          vehicle_type VARCHAR(50),
          license_number VARCHAR(100),
          vehicle_registration VARCHAR(100),
          current_latitude DECIMAL(10, 8),
          current_longitude DECIMAL(11, 8),
          is_available BOOLEAN DEFAULT true,
          rating DECIMAL(3,2) DEFAULT 0.00,
          total_deliveries INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          kyc_data JSONB,
          kyc_status VARCHAR(20) DEFAULT 'PENDING',
          kyc_submitted_at TIMESTAMP,
          kyc_approved_at TIMESTAMP,
          kyc_approved_by INTEGER REFERENCES users(id),
          verification_level VARCHAR(20) DEFAULT 'BASIC',
          background_check_status VARCHAR(20) DEFAULT 'PENDING'
        )
      `);
    }

    if (missingTables.includes('merchant_profiles')) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS merchant_profiles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          business_name VARCHAR(255) NOT NULL,
          business_type VARCHAR(100),
          business_address TEXT,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          phone VARCHAR(20),
          description TEXT,
          operating_hours JSONB,
          is_verified BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          rating DECIMAL(3,2) DEFAULT 0.00,
          total_orders INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    if (missingTables.includes('products')) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          seller_id INTEGER REFERENCES users(id) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          category_name VARCHAR(100),
          stock_level INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          images JSONB DEFAULT '[]',
          rating DECIMAL(3,2) DEFAULT 0.00,
          total_reviews INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // Create all tables from migration 0009 if missing
    if (missingTables.includes('mfa_tokens')) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS mfa_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          token TEXT NOT NULL,
          method VARCHAR(10) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          is_used BOOLEAN DEFAULT FALSE,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    if (missingTables.includes('verification_documents')) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS verification_documents (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          document_type VARCHAR(30) NOT NULL,
          document_number VARCHAR(50),
          file_name TEXT NOT NULL,
          file_size INTEGER,
          mime_type VARCHAR(100),
          expiry_date TIMESTAMP,
          status VARCHAR(20) DEFAULT 'PENDING',
          validation_score DECIMAL(3,2),
          extracted_data JSONB,
          rejection_reason TEXT,
          reviewed_by INTEGER REFERENCES users(id),
          reviewed_at TIMESTAMP,
          uploaded_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    if (missingTables.includes('security_logs')) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS security_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          action VARCHAR(50) NOT NULL,
          details JSONB,
          ip_address VARCHAR(45),
          user_agent TEXT,
          severity VARCHAR(20) DEFAULT 'INFO',
          timestamp TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    if (missingTables.includes('trusted_devices')) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS trusted_devices (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          device_token TEXT UNIQUE NOT NULL,
          device_name VARCHAR(100),
          device_type VARCHAR(50),
          browser_info TEXT,
          last_used_at TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // Create all indexes if missing
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_merchant_profiles_user_id ON merchant_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
      CREATE INDEX IF NOT EXISTS idx_mfa_tokens_user_id ON mfa_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_verification_documents_user_id ON verification_documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
    `);

    // Add missing columns to users table from migration 0009
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS mfa_method VARCHAR(10),
      ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
      ADD COLUMN IF NOT EXISTS mfa_backup_codes JSONB,
      ADD COLUMN IF NOT EXISTS biometric_hash TEXT,
      ADD COLUMN IF NOT EXISTS biometric_type VARCHAR(20),
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP
    `);

    console.log('✅ All missing tables and columns have been created!');
    
  } catch (error) {
    console.error('❌ Error verifying/creating tables:', error);
    throw error;
  }
}
