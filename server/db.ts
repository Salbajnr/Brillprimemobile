import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });


import { pgTable, text, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const severityEnum = pgEnum('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const sourceEnum = pgEnum('source', ['frontend', 'backend', 'database', 'external']);

export const errorLogs = pgTable("error_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  message: text("message").notNull(),
  stack: text("stack"),
  url: text("url"),
  userAgent: text("user_agent"),
  userId: integer("user_id").references(() => users.id),
  severity: severityEnum("severity").default('MEDIUM'),
  source: sourceEnum("source").default('backend'),
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"),
  resolved: timestamp("resolved"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
