
import { db } from "../db";
import { sql } from "drizzle-orm";

export async function up() {
  console.log('Creating performance indexes...');
  
  // User-related indexes
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_btree ON users USING btree(email);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active ON users(role, is_active);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
  `);

  // Order-related indexes
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_status ON orders(customer_id, status);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_merchant_status ON orders(merchant_id, status);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_driver_status ON orders(driver_id, status);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at_desc ON orders(created_at DESC);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_type_status ON orders(order_type, status);
  `);

  // Transaction-related indexes
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_status ON transactions(user_id, payment_status);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_created_desc ON transactions(created_at DESC);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_ref ON transactions(transaction_ref);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_gateway_ref ON transactions(payment_gateway_ref);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_amount ON transactions(amount);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
  `);

  // Notification indexes
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_desc ON notifications(created_at DESC);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type ON notifications(type);
  `);

  // Product indexes
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_active ON products(seller_id, is_active);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category ON products(category_name);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price ON products(price);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_rating ON products(rating DESC);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_stock ON products(stock_level);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || description));
  `);

  // Location-based indexes for spatial queries
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_profiles_location ON driver_profiles(current_latitude, current_longitude);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_profiles_location ON merchant_profiles(latitude, longitude);
  `);

  // Composite indexes for common queries
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_driver_created ON orders(driver_id, created_at DESC) WHERE driver_id IS NOT NULL;
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
  `);

  // Partial indexes for better performance
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_active ON orders(id) WHERE status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS');
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_pending ON transactions(id) WHERE payment_status = 'PENDING';
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;
  `);

  console.log('Performance indexes created successfully');
}

export async function down() {
  console.log('Dropping performance indexes...');
  
  // Drop all created indexes
  const indexes = [
    'idx_users_email_btree', 'idx_users_role_active', 'idx_users_created_at', 'idx_users_phone',
    'idx_orders_customer_status', 'idx_orders_merchant_status', 'idx_orders_driver_status',
    'idx_orders_created_at_desc', 'idx_orders_status_created', 'idx_orders_type_status',
    'idx_transactions_user_status', 'idx_transactions_created_desc', 'idx_transactions_ref',
    'idx_transactions_gateway_ref', 'idx_transactions_amount', 'idx_transactions_order_id',
    'idx_notifications_user_read', 'idx_notifications_created_desc', 'idx_notifications_type',
    'idx_products_seller_active', 'idx_products_category', 'idx_products_price',
    'idx_products_rating', 'idx_products_stock', 'idx_products_search',
    'idx_driver_profiles_location', 'idx_merchant_profiles_location',
    'idx_orders_customer_created', 'idx_orders_driver_created', 'idx_transactions_user_created',
    'idx_orders_active', 'idx_transactions_pending', 'idx_notifications_unread'
  ];

  for (const index of indexes) {
    await db.execute(sql`DROP INDEX CONCURRENTLY IF EXISTS ${sql.raw(index)};`);
  }

  console.log('Performance indexes dropped successfully');
}
