
import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal, jsonb } from "drizzle-orm/pg-core";

export async function up(db: any) {
  // Add MFA and security fields to users table
  await db.execute(`
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

  // Create MFA tokens table
  await db.execute(`
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

  // Create verification documents table
  await db.execute(`
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

  // Create security logs table
  await db.execute(`
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

  // Create trusted devices table
  await db.execute(`
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

  // Add enhanced KYC fields to driver_profiles
  await db.execute(`
    ALTER TABLE driver_profiles 
    ADD COLUMN IF NOT EXISTS kyc_data JSONB,
    ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS kyc_approved_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS verification_level VARCHAR(20) DEFAULT 'BASIC',
    ADD COLUMN IF NOT EXISTS background_check_status VARCHAR(20) DEFAULT 'PENDING'
  `);

  // Create indexes for performance
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_mfa_tokens_user_id ON mfa_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_mfa_tokens_token ON mfa_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_verification_documents_user_id ON verification_documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_documents_status ON verification_documents(status);
    CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);
    CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_trusted_devices_token ON trusted_devices(device_token);
  `);

  console.log('✅ Enhanced security tables created successfully');
}

export async function down(db: any) {
  // Remove added columns from users table
  await db.execute(`
    ALTER TABLE users 
    DROP COLUMN IF EXISTS mfa_enabled,
    DROP COLUMN IF EXISTS mfa_method,
    DROP COLUMN IF EXISTS mfa_secret,
    DROP COLUMN IF EXISTS mfa_backup_codes,
    DROP COLUMN IF EXISTS biometric_hash,
    DROP COLUMN IF EXISTS biometric_type,
    DROP COLUMN IF EXISTS last_login_at,
    DROP COLUMN IF EXISTS login_attempts,
    DROP COLUMN IF EXISTS account_locked_until
  `);

  // Remove added columns from driver_profiles table
  await db.execute(`
    ALTER TABLE driver_profiles 
    DROP COLUMN IF EXISTS kyc_data,
    DROP COLUMN IF EXISTS kyc_status,
    DROP COLUMN IF EXISTS kyc_submitted_at,
    DROP COLUMN IF EXISTS kyc_approved_at,
    DROP COLUMN IF EXISTS kyc_approved_by,
    DROP COLUMN IF EXISTS verification_level,
    DROP COLUMN IF EXISTS background_check_status
  `);

  // Drop new tables
  await db.execute(`DROP TABLE IF EXISTS trusted_devices`);
  await db.execute(`DROP TABLE IF EXISTS security_logs`);
  await db.execute(`DROP TABLE IF EXISTS verification_documents`);
  await db.execute(`DROP TABLE IF EXISTS mfa_tokens`);

  console.log('✅ Enhanced security tables removed successfully');
}
