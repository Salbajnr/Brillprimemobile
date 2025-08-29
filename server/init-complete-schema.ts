
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://replit:password@localhost:5432/brillprime_development'
});

export async function initializeCompleteSchema() {
  try {
    console.log('🔄 Creating complete database schema...');

    // Create enums first
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE transaction_type AS ENUM ('WALLET_FUNDING', 'PAYMENT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'DELIVERY_EARNINGS', 'REFUND');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE kyc_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_RESUBMISSION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE driver_tier AS ENUM ('STANDARD', 'PREMIUM', 'ELITE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE support_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create tables in correct order (respecting foreign key dependencies)
    
    // 1. Users table (base table)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        full_name TEXT NOT NULL,
        phone TEXT,
        profile_picture TEXT,
        role role DEFAULT 'CONSUMER',
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        mfa_method TEXT,
        mfa_secret TEXT,
        mfa_backup_codes JSONB,
        biometric_hash TEXT,
        biometric_type TEXT,
        last_login_at TIMESTAMP,
        login_attempts INTEGER DEFAULT 0,
        account_locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. Categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 3. Wallets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE,
        balance DECIMAL(15,2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 4. Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER REFERENCES users(id) NOT NULL,
        merchant_id INTEGER REFERENCES users(id),
        driver_id INTEGER REFERENCES users(id),
        order_type TEXT NOT NULL,
        status order_status DEFAULT 'PENDING',
        total_amount DECIMAL(10,2) NOT NULL,
        driver_earnings DECIMAL(10,2),
        delivery_address TEXT,
        pickup_address TEXT,
        delivery_latitude DECIMAL(10,8),
        delivery_longitude DECIMAL(11,8),
        order_data JSONB,
        accepted_at TIMESTAMP,
        picked_up_at TIMESTAMP,
        delivered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 5. Transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        order_id INTEGER REFERENCES orders(id),
        recipient_id INTEGER REFERENCES users(id),
        amount DECIMAL(15,2) NOT NULL,
        net_amount DECIMAL(15,2),
        currency TEXT DEFAULT 'NGN',
        type transaction_type NOT NULL,
        status TEXT DEFAULT 'PENDING',
        payment_method TEXT,
        payment_status payment_status DEFAULT 'PENDING',
        transaction_ref TEXT UNIQUE,
        payment_gateway_ref TEXT,
        paystack_transaction_id TEXT,
        description TEXT,
        metadata JSONB,
        initiated_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 6. Products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        merchant_id INTEGER REFERENCES users(id) NOT NULL,
        seller_id INTEGER REFERENCES users(id) NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category TEXT NOT NULL,
        category_name TEXT,
        unit TEXT NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        stock_level INTEGER DEFAULT 0,
        image_url TEXT,
        images JSONB DEFAULT '[]',
        is_available BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        rating DECIMAL(3,2) DEFAULT 0.00,
        total_reviews INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 7. Driver Profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE,
        vehicle_type TEXT,
        vehicle_plate TEXT,
        vehicle_model TEXT,
        vehicle_color TEXT,
        license_number TEXT,
        vehicle_registration TEXT,
        current_latitude DECIMAL(10,8),
        current_longitude DECIMAL(11,8),
        is_online BOOLEAN DEFAULT FALSE,
        is_available BOOLEAN DEFAULT TRUE,
        current_location TEXT,
        rating DECIMAL(3,2) DEFAULT 0.00,
        total_deliveries INTEGER DEFAULT 0,
        total_earnings DECIMAL(15,2) DEFAULT 0.00,
        verification_status verification_status DEFAULT 'PENDING',
        tier driver_tier DEFAULT 'STANDARD',
        kyc_data JSONB,
        kyc_status kyc_status DEFAULT 'PENDING',
        kyc_submitted_at TIMESTAMP,
        kyc_approved_at TIMESTAMP,
        kyc_approved_by INTEGER REFERENCES users(id),
        verification_level TEXT DEFAULT 'BASIC',
        background_check_status TEXT DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 8. Merchant Profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS merchant_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE,
        business_name TEXT NOT NULL,
        business_address TEXT,
        business_type TEXT,
        business_phone TEXT,
        business_email TEXT,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        phone TEXT,
        description TEXT,
        operating_hours JSONB,
        is_open BOOLEAN DEFAULT TRUE,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        rating DECIMAL(3,2) DEFAULT 0.00,
        total_orders INTEGER DEFAULT 0,
        revenue DECIMAL(15,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 9. Fuel Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fuel_orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES users(id) NOT NULL,
        driver_id INTEGER REFERENCES users(id),
        station_id TEXT NOT NULL,
        fuel_type TEXT NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(15,2) NOT NULL,
        delivery_address TEXT NOT NULL,
        delivery_latitude DECIMAL(10,8),
        delivery_longitude DECIMAL(11,8),
        status order_status DEFAULT 'PENDING',
        scheduled_delivery_time TEXT,
        accepted_at TIMESTAMP,
        picked_up_at TIMESTAMP,
        delivered_at TIMESTAMP,
        estimated_delivery_time TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 10. Ratings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES users(id) NOT NULL,
        order_id INTEGER REFERENCES orders(id) NOT NULL,
        driver_id INTEGER REFERENCES users(id),
        merchant_id INTEGER REFERENCES users(id),
        product_id TEXT,
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 11. Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 12. Identity Verifications table
    await pool.query(`
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
      )
    `);

    // 13. Error Logs table
    await pool.query(`
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
      )
    `);

    // 14. MFA Tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mfa_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        token TEXT NOT NULL,
        method TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 15. Verification Documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        document_type TEXT NOT NULL,
        document_number TEXT,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        expiry_date TIMESTAMP,
        status TEXT DEFAULT 'PENDING',
        validation_score DECIMAL(3,2),
        extracted_data JSONB,
        rejection_reason TEXT,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 16. Security Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        details JSONB,
        ip_address TEXT,
        user_agent TEXT,
        severity TEXT DEFAULT 'INFO',
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // 17. Trusted Devices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trusted_devices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        device_token TEXT UNIQUE NOT NULL,
        device_name TEXT,
        device_type TEXT,
        browser_info TEXT,
        last_used_at TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 18. Support Tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'MEDIUM',
        status support_status DEFAULT 'OPEN',
        assigned_to INTEGER REFERENCES users(id),
        attachments JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 19. Chat Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) NOT NULL,
        recipient_id INTEGER REFERENCES users(id) NOT NULL,
        order_id INTEGER REFERENCES orders(id),
        support_ticket_id INTEGER REFERENCES support_tickets(id),
        message TEXT NOT NULL,
        message_type TEXT DEFAULT 'TEXT',
        attachments JSONB,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 20. Toll Gates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS toll_gates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        operating_hours JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 21. Suspicious Activities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suspicious_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        activity_type TEXT NOT NULL,
        description TEXT NOT NULL,
        risk_indicators JSONB,
        timestamp TIMESTAMP DEFAULT NOW(),
        ip_address TEXT,
        device_fingerprint TEXT,
        severity TEXT DEFAULT 'MEDIUM'
      )
    `);

    // 22. Fraud Alerts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fraud_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        alert_type TEXT NOT NULL,
        description TEXT NOT NULL,
        risk_score DECIMAL(5,2),
        status TEXT DEFAULT 'ACTIVE',
        resolved_at TIMESTAMP,
        resolved_by INTEGER REFERENCES users(id),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 23. Admin Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        role TEXT DEFAULT 'ADMIN',
        permissions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 24. Compliance Documents table
    await pool.query(`
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

    // 25. Content Reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_reports (
        id SERIAL PRIMARY KEY,
        content_type TEXT NOT NULL,
        content_id TEXT NOT NULL,
        reported_by INTEGER REFERENCES users(id),
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 26. Moderation Responses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS moderation_responses (
        id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES content_reports(id) NOT NULL,
        admin_id INTEGER REFERENCES admin_users(id) NOT NULL,
        response TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 27. User Locations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_locations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        heading DECIMAL(5,2),
        speed DECIMAL(8,2),
        accuracy DECIMAL(8,2),
        location_type TEXT,
        timestamp TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 28. Payment Methods table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        type TEXT NOT NULL,
        details JSONB NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 29. Admin Payment Actions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_payment_actions (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admin_users(id) NOT NULL,
        action TEXT NOT NULL,
        payment_id TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 30. Account Flags table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_flags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        flag_type TEXT NOT NULL,
        severity TEXT DEFAULT 'MEDIUM',
        reason TEXT NOT NULL,
        flagged_by INTEGER REFERENCES admin_users(id),
        status TEXT DEFAULT 'ACTIVE',
        resolved_by INTEGER REFERENCES admin_users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 31. Conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES users(id) NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        last_message TEXT,
        last_message_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 32. Driver Verifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        document_type TEXT NOT NULL,
        document_url TEXT NOT NULL,
        status verification_status DEFAULT 'PENDING',
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 33. Audit Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resource_id TEXT,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        session_id TEXT,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 34. Order Tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_tracking (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) NOT NULL,
        driver_id INTEGER REFERENCES users(id),
        status TEXT NOT NULL,
        location TEXT,
        notes TEXT,
        estimated_arrival TIMESTAMP,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create all necessary indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_merchant_profiles_user_id ON merchant_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON products(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
    `);

    console.log('✅ Complete database schema created successfully!');
    console.log('📊 All tables, enums, and indexes are now in place');
    
    return true;
  } catch (error) {
    console.error('❌ Database schema creation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
