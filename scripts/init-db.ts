
import { Pool } from 'pg';
import { verifyAndCreateMissingTables } from './verify-database-tables';
import { PRODUCTION_DATABASE_CONFIG, validateDatabaseConnection } from './database-config-override';

// Always use Replit database configuration
const DATABASE_CONNECTION_STRING = PRODUCTION_DATABASE_CONFIG.connectionString;

// Validate connection before proceeding
if (!validateDatabaseConnection(DATABASE_CONNECTION_STRING)) {
  throw new Error('Invalid database configuration - only Replit database allowed');
}

const pool = new Pool({ 
  connectionString: DATABASE_CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create enums
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        full_name TEXT NOT NULL,
        phone TEXT,
        role role DEFAULT 'CONSUMER',
        is_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS identity_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        document_type TEXT NOT NULL,
        document_number TEXT NOT NULL,
        document_image_url TEXT,
        verification_status verification_status DEFAULT 'PENDING',
        submitted_at TIMESTAMP DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        reviewed_by INTEGER REFERENCES users(id),
        rejection_reason TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER REFERENCES users(id) NOT NULL,
        merchant_id INTEGER REFERENCES users(id),
        driver_id INTEGER REFERENCES users(id),
        order_type TEXT NOT NULL,
        status order_status DEFAULT 'PENDING',
        total_amount DECIMAL(10,2) NOT NULL,
        delivery_address TEXT,
        order_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        user_id INTEGER REFERENCES users(id) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency TEXT DEFAULT 'NGN',
        payment_method TEXT NOT NULL,
        payment_status payment_status DEFAULT 'PENDING',
        transaction_ref TEXT UNIQUE,
        payment_gateway_ref TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        stack TEXT,
        url TEXT,
        user_agent TEXT,
        user_id INTEGER REFERENCES users(id),
        severity TEXT DEFAULT 'MEDIUM',
        source TEXT DEFAULT 'backend',
        timestamp TIMESTAMP DEFAULT NOW(),
        metadata JSONB
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `);

    console.log('Database initialized successfully');
    
    // Verify all tables exist and create missing ones
    await verifyAndCreateMissingTables();
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default initializeDatabase;
