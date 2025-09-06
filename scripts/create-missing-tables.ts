import { db } from "./db";
import { sql } from "drizzle-orm";

export async function createAllMissingTables() {
  console.log('🔧 Creating all missing database tables...');

  try {
    // First, ensure all required enums exist
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE admin_role AS ENUM ('ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'MODERATOR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Core users table with all required columns
    await db.execute(sql`
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

    // Categories table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Products table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS products (
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
      )
    `);

    // Orders table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orders (
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
      )
    `);

    // Wallets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE,
        balance DECIMAL(12,2) DEFAULT 0.00,
        currency VARCHAR(3) DEFAULT 'NGN',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Transactions table
    await db.execute(sql`
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
        initiated_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Driver profiles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS driver_profiles (
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
      )
    `);

    // Merchant profiles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS merchant_profiles (
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
      )
    `);

    // Fuel orders table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS fuel_orders (
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
      )
    `);

    // Ratings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        rater_id INTEGER REFERENCES users(id) NOT NULL,
        rated_id INTEGER REFERENCES users(id) NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        review TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Trusted devices table
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

    // Support tickets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
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
      )
    `);

    // Support responses table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_responses (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES support_tickets(id) NOT NULL,
        message TEXT NOT NULL,
        responder_type TEXT NOT NULL,
        responder_id INTEGER REFERENCES users(id) NOT NULL,
        attachments TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Chat messages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id INTEGER REFERENCES users(id) NOT NULL,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        attachments JSONB DEFAULT '[]',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Toll gates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS toll_gates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location TEXT NOT NULL,
        latitude VARCHAR(20),
        longitude VARCHAR(20),
        price DECIMAL(8,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Suspicious activities table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS suspicious_activities (
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
      )
    `);

    // Fraud alerts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS fraud_alerts (
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
      )
    `);

    // Compliance documents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS compliance_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        document_type TEXT NOT NULL,
        document_url TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Moderation responses table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moderation_responses (
        id SERIAL PRIMARY KEY,
        report_id INTEGER NOT NULL,
        admin_id INTEGER REFERENCES users(id) NOT NULL,
        response TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // User locations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_locations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        address TEXT,
        is_current BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Payment methods table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        method_type VARCHAR(20) NOT NULL,
        provider VARCHAR(50),
        account_details JSONB,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Account flags table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS account_flags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        flag_type VARCHAR(50) NOT NULL,
        reason TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        flagged_by INTEGER REFERENCES users(id),
        flagged_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        resolved_by INTEGER REFERENCES users(id)
      )
    `);

    // Conversations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS conversations (
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
      )
    `);

    // Driver verifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS driver_verifications (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER REFERENCES users(id) NOT NULL,
        verification_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        document_url TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        reviewed_by INTEGER REFERENCES users(id),
        notes TEXT
      )
    `);

    // Create all important indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
      CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
      CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
      CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_merchant_profiles_user_id ON merchant_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_fuel_orders_customer_id ON fuel_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_fuel_orders_driver_id ON fuel_orders(driver_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_mfa_tokens_user_id ON mfa_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_verification_documents_user_id ON verification_documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
    `);

    console.log('✅ All missing database tables created successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error creating missing tables:', error);
    throw error;
  }
}

export async function seedDefaultData() {
  try {
    console.log('🌱 Seeding default data...');

    // Check if categories exist, if not create them
    const [existingCategories] = await db.execute(sql`SELECT COUNT(*) as count FROM categories`);

    if (existingCategories.count === 0) {
      await db.execute(sql`
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

    // Check if toll gates exist, if not create them
    const [existingTollGates] = await db.execute(sql`SELECT COUNT(*) as count FROM toll_gates`);

    if (existingTollGates.count === 0) {
      await db.execute(sql`
        INSERT INTO toll_gates (name, location, latitude, longitude, price, is_active) VALUES 
        ('Lagos-Ibadan Expressway Toll', 'Lagos-Ibadan Expressway, Ogun State', '6.6018', '3.3515', 200.00, true),
        ('Lekki-Ajah Toll', 'Lekki-Epe Expressway, Lagos', '6.4281', '3.5595', 250.00, true),
        ('Abuja-Keffi Toll', 'Abuja-Keffi Expressway, FCT', '9.0579', '7.4951', 150.00, true)
      `);
      console.log('✅ Default toll gates created');
    }

    console.log('✅ Default data seeding completed');

  } catch (error) {
    console.log('⚠️ Data seeding encountered an issue:', error.message);
  }
}