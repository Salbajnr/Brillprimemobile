
import { db } from "../db";
import { sql } from "drizzle-orm";

export async function up() {
  // Create severity enum
  await db.execute(sql`
    CREATE TYPE severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  `);

  // Create source enum
  await db.execute(sql`
    CREATE TYPE source AS ENUM ('frontend', 'backend', 'database', 'external');
  `);

  // Create error_logs table
  await db.execute(sql`
    CREATE TABLE error_logs (
      id SERIAL PRIMARY KEY,
      message TEXT NOT NULL,
      stack TEXT,
      url TEXT,
      user_agent TEXT,
      user_id INTEGER REFERENCES users(id),
      severity severity DEFAULT 'MEDIUM',
      source source DEFAULT 'backend',
      timestamp TIMESTAMP DEFAULT NOW(),
      metadata JSONB,
      resolved TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create indexes for better performance
  await db.execute(sql`
    CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp);
    CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
    CREATE INDEX idx_error_logs_severity ON error_logs(severity);
    CREATE INDEX idx_error_logs_source ON error_logs(source);
    CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
  `);
}

export async function down() {
  await db.execute(sql`DROP TABLE IF EXISTS error_logs;`);
  await db.execute(sql`DROP TYPE IF EXISTS severity;`);
  await db.execute(sql`DROP TYPE IF EXISTS source;`);
}
