
import { sql } from 'drizzle-orm';
import { db } from '../db';

export async function up() {
  console.log('Running migration: Add chat and tracking tables...');

  // Conversations table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id VARCHAR(255) PRIMARY KEY,
      type VARCHAR(50) NOT NULL DEFAULT 'direct',
      participants JSONB NOT NULL DEFAULT '[]',
      order_id VARCHAR(255),
      title VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Messages table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id VARCHAR(255) NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      message_type VARCHAR(50) DEFAULT 'text',
      attachments JSONB DEFAULT '[]',
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Location tracking table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS location_tracking (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      order_id VARCHAR(255),
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      accuracy DECIMAL(8, 2),
      heading DECIMAL(5, 2),
      speed DECIMAL(8, 2),
      altitude DECIMAL(8, 2),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
    )
  `);

  // Order status history table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      changed_by INTEGER,
      notes TEXT,
      location JSONB,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Real-time sessions table for WebSocket connections
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS realtime_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      socket_id VARCHAR(255) NOT NULL,
      connection_type VARCHAR(50) DEFAULT 'websocket',
      user_agent TEXT,
      ip_address INET,
      connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_ping TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Push notification subscriptions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh_key TEXT NOT NULL,
      auth_key TEXT NOT NULL,
      user_agent TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Delivery tracking table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS delivery_tracking (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) NOT NULL,
      driver_id INTEGER NOT NULL,
      current_location JSONB,
      estimated_arrival TIMESTAMP,
      route_data JSONB,
      distance_remaining DECIMAL(8, 2),
      eta_minutes INTEGER,
      last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
    )
  `);

  // Notification log table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notification_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      channel VARCHAR(50) DEFAULT 'app',
      data JSONB,
      is_read BOOLEAN DEFAULT false,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`);
  
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_location_tracking_user_id ON location_tracking(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_location_tracking_order_id ON location_tracking(order_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_location_tracking_timestamp ON location_tracking(timestamp)`);
  
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_order_status_history_timestamp ON order_status_history(timestamp)`);
  
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_realtime_sessions_user_id ON realtime_sessions(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_realtime_sessions_socket_id ON realtime_sessions(socket_id)`);
  
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_id ON delivery_tracking(order_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_delivery_tracking_driver_id ON delivery_tracking(driver_id)`);
  
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at)`);

  console.log('Migration completed: Chat and tracking tables added successfully');
}

export async function down() {
  console.log('Reverting migration: Remove chat and tracking tables...');

  await db.execute(sql`DROP TABLE IF EXISTS notification_log`);
  await db.execute(sql`DROP TABLE IF EXISTS delivery_tracking`);
  await db.execute(sql`DROP TABLE IF EXISTS push_subscriptions`);
  await db.execute(sql`DROP TABLE IF EXISTS realtime_sessions`);
  await db.execute(sql`DROP TABLE IF EXISTS order_status_history`);
  await db.execute(sql`DROP TABLE IF EXISTS location_tracking`);
  await db.execute(sql`DROP TABLE IF EXISTS messages`);
  await db.execute(sql`DROP TABLE IF EXISTS conversations`);

  console.log('Migration reverted: Chat and tracking tables removed');
}
