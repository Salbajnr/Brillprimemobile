
const { Pool } = require('pg');
require('dotenv').config();

// Use the same database URL from your environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not found');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runDatabaseSetup() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database setup for Render deployment...');
    console.log('🔗 Database URL:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

    // Test connection
    await client.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Import and run the setup
    const { createAllMissingTables, seedDefaultData } = require('./server/create-missing-tables.ts');
    
    if (typeof createAllMissingTables === 'function') {
      await createAllMissingTables();
      await seedDefaultData();
    } else {
      // Fallback: run SQL directly
      console.log('📋 Running direct SQL table creation...');
      
      // Create all enums first
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

      // Create users table with all required columns
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
          profile_picture TEXT,
          mfa_enabled BOOLEAN DEFAULT FALSE,
          mfa_method VARCHAR(10),
          mfa_secret TEXT,
          mfa_backup_codes JSONB,
          biometric_hash TEXT,
          biometric_type VARCHAR(20),
          last_login_at TIMESTAMP,
          login_attempts INTEGER DEFAULT 0,
          account_locked_until TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create all other essential tables
      const tables = [
        `CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,
        
        `CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          seller_id INTEGER REFERENCES users(id) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          category_id INTEGER REFERENCES categories(id),
          category_name VARCHAR(100),
          stock_level INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          images JSONB DEFAULT '[]',
          rating DECIMAL(3,2) DEFAULT 0.00,
          total_reviews INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        `CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          order_number TEXT UNIQUE NOT NULL,
          customer_id INTEGER REFERENCES users(id),
          user_id INTEGER REFERENCES users(id),
          merchant_id INTEGER REFERENCES users(id),
          driver_id INTEGER REFERENCES users(id),
          order_type TEXT NOT NULL,
          status order_status DEFAULT 'PENDING',
          total_amount DECIMAL(10,2) NOT NULL,
          delivery_address TEXT,
          order_data JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        `CREATE TABLE IF NOT EXISTS wallets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE,
          balance DECIMAL(12,2) DEFAULT 0.00,
          currency VARCHAR(3) DEFAULT 'NGN',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        `CREATE TABLE IF NOT EXISTS transactions (
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
          initiated_at TIMESTAMP DEFAULT NOW(),
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )`,

        `CREATE TABLE IF NOT EXISTS driver_profiles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE,
          vehicle_type VARCHAR(50),
          license_number VARCHAR(100),
          vehicle_registration VARCHAR(100),
          current_latitude DECIMAL(10, 8),
          current_longitude DECIMAL(11, 8),
          is_available BOOLEAN DEFAULT true,
          rating DECIMAL(3,2) DEFAULT 0.00,
          total_deliveries INTEGER DEFAULT 0,
          kyc_data JSONB,
          kyc_status VARCHAR(20) DEFAULT 'PENDING',
          kyc_submitted_at TIMESTAMP,
          kyc_approved_at TIMESTAMP,
          kyc_approved_by INTEGER REFERENCES users(id),
          verification_level VARCHAR(20) DEFAULT 'BASIC',
          background_check_status VARCHAR(20) DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        `CREATE TABLE IF NOT EXISTS merchant_profiles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE,
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
        )`,

        `CREATE TABLE IF NOT EXISTS fuel_orders (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES users(id) NOT NULL,
          driver_id INTEGER REFERENCES users(id),
          fuel_type VARCHAR(20) NOT NULL,
          quantity DECIMAL(8,2) NOT NULL,
          price_per_liter DECIMAL(8,2) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          delivery_address TEXT NOT NULL,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          status VARCHAR(20) DEFAULT 'PENDING',
          payment_status VARCHAR(20) DEFAULT 'PENDING',
          scheduled_time TIMESTAMP,
          delivered_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        `CREATE TABLE IF NOT EXISTS ratings (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id),
          rater_id INTEGER REFERENCES users(id) NOT NULL,
          rated_id INTEGER REFERENCES users(id) NOT NULL,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          review TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )`,

        `CREATE TABLE IF NOT EXISTS trusted_devices (
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
        )`,

        `CREATE TABLE IF NOT EXISTS support_tickets (
          id SERIAL PRIMARY KEY,
          ticket_number TEXT UNIQUE NOT NULL,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          user_role TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'OPEN',
          priority TEXT DEFAULT 'MEDIUM',
          assigned_to INTEGER REFERENCES users(id),
          admin_notes TEXT,
          resolution TEXT,
          resolved_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        `CREATE TABLE IF NOT EXISTS chat_messages (
          id SERIAL PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          sender_id INTEGER REFERENCES users(id) NOT NULL,
          content TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          attachments JSONB DEFAULT '[]',
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )`,

        `CREATE TABLE IF NOT EXISTS toll_gates (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          location TEXT NOT NULL,
          latitude VARCHAR(20),
          longitude VARCHAR(20),
          price DECIMAL(8,2) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        `CREATE TABLE IF NOT EXISTS suspicious_activities (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          activity_type VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          risk_level VARCHAR(20) DEFAULT 'LOW',
          status VARCHAR(20) DEFAULT 'PENDING',
          flagged_at TIMESTAMP DEFAULT NOW(),
          reviewed_at TIMESTAMP,
          reviewed_by INTEGER REFERENCES users(id),
          metadata JSONB
        )`,

        `CREATE TABLE IF NOT EXISTS fraud_alerts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          transaction_id INTEGER REFERENCES transactions(id),
          alert_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) DEFAULT 'MEDIUM',
          description TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'ACTIVE',
          triggered_at TIMESTAMP DEFAULT NOW(),
          resolved_at TIMESTAMP,
          resolved_by INTEGER REFERENCES users(id),
          metadata JSONB
        )`,

        `CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          customer_id INTEGER REFERENCES users(id),
          status TEXT DEFAULT 'ACTIVE',
          last_message TEXT,
          last_message_at TIMESTAMP,
          type TEXT DEFAULT 'direct',
          participants JSONB DEFAULT '[]',
          order_id TEXT,
          title TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,

        `CREATE TABLE IF NOT EXISTS driver_verifications (
          id SERIAL PRIMARY KEY,
          driver_id INTEGER REFERENCES users(id) NOT NULL,
          verification_type VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'PENDING',
          document_url TEXT,
          submitted_at TIMESTAMP DEFAULT NOW(),
          reviewed_at TIMESTAMP,
          reviewed_by INTEGER REFERENCES users(id),
          notes TEXT
        )`
      ];

      for (const tableSQL of tables) {
        await client.query(tableSQL);
      }

      // Create indexes
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
        'CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id)',
        'CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_merchant_profiles_user_id ON merchant_profiles(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id)'
      ];

      for (const indexSQL of indexes) {
        await client.query(indexSQL);
      }

      // Insert default data
      const categoriesCount = await client.query('SELECT COUNT(*) FROM categories');
      if (parseInt(categoriesCount.rows[0].count) === 0) {
        await client.query(`
          INSERT INTO categories (name, description, is_active) VALUES 
          ('Electronics', 'Electronic devices and accessories', true),
          ('Food & Beverages', 'Food items and drinks', true),
          ('Clothing', 'Clothes and fashion accessories', true),
          ('Health & Beauty', 'Health and beauty products', true),
          ('Home & Garden', 'Home improvement and garden items', true),
          ('Sports & Outdoors', 'Sports equipment and outdoor gear', true),
          ('Books & Media', 'Books, movies, and media content', true),
          ('Automotive', 'Car parts and automotive accessories', true)
        `);
        console.log('✅ Default categories created');
      }

      const tollGatesCount = await client.query('SELECT COUNT(*) FROM toll_gates');
      if (parseInt(tollGatesCount.rows[0].count) === 0) {
        await client.query(`
          INSERT INTO toll_gates (name, location, latitude, longitude, price, is_active) VALUES 
          ('Lagos-Ibadan Expressway Toll', 'Lagos-Ibadan Expressway, Ogun State', '6.6018', '3.3515', 200.00, true),
          ('Lekki-Ajah Toll', 'Lekki-Epe Expressway, Lagos', '6.4281', '3.5595', 250.00, true),
          ('Abuja-Keffi Toll', 'Abuja-Keffi Expressway, FCT', '9.0579', '7.4951', 150.00, true)
        `);
        console.log('✅ Default toll gates created');
      }
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('📊 All required tables and data have been created');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
runDatabaseSetup()
  .then(() => {
    console.log('✅ Database is ready for Render deployment!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
