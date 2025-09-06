
import dotenv from 'dotenv';

// Load .env file but don't override system environment variables (Replit compatibility)
dotenv.config({ path: '.env', override: false });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgTable, serial, text, integer, timestamp, jsonb, boolean, decimal, pgEnum } from "drizzle-orm/pg-core";
import { eq, and, desc } from 'drizzle-orm';

// Use Replit PostgreSQL database
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. Please ensure PostgreSQL database is configured.');
}

console.log('🔧 Using Replit PostgreSQL database');
console.log('🔗 Database:', DATABASE_URL.replace(/:[^:@]*@/, ':***@')); // Hide password in logs

// Define enums
export const roleEnum = pgEnum('role', ['CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN']);
export const verificationStatusEnum = pgEnum('verification_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password"),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: roleEnum("role").default('CONSUMER'),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Identity verification table
export const identityVerifications = pgTable("identity_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number").notNull(),
  documentImageUrl: text("document_image_url"),
  verificationStatus: verificationStatusEnum("verification_status").default('PENDING'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason")
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").unique().notNull(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  merchantId: integer("merchant_id").references(() => users.id),
  driverId: integer("driver_id").references(() => users.id),
  orderType: text("order_type").notNull(), // 'PRODUCT', 'FUEL', 'TOLL'
  status: orderStatusEnum("status").default('PENDING'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: text("delivery_address"),
  orderData: jsonb("order_data"), // Store order-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default('NGN'),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default('PENDING'),
  transactionRef: text("transaction_ref").unique(),
  paymentGatewayRef: text("payment_gateway_ref"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'ORDER', 'PAYMENT', 'SYSTEM', etc.
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

// Error logs table
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  stack: text("stack"),
  url: text("url"),
  userAgent: text("user_agent"),
  userId: integer("user_id").references(() => users.id),
  severity: text("severity").default("MEDIUM"),
  source: text("source").default("backend"),
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata")
});

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle(pool, { 
  schema: { 
    users, 
    identityVerifications, 
    orders, 
    transactions, 
    notifications, 
    errorLogs 
  } 
});

// Database operations
export const dbOperations = {
  // User operations
  async createUser(userData: any) {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  },

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  },

  async getUserById(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async updateUser(id: number, userData: any) {
    const [user] = await db.update(users).set({
      ...userData,
      updatedAt: new Date()
    }).where(eq(users.id, id)).returning();
    return user;
  },

  // Order operations
  async createOrder(orderData: any) {
    const [order] = await db.insert(orders).values({
      ...orderData,
      orderNumber: `ORD-${Date.now()}`
    }).returning();
    return order;
  },

  async getOrdersByUserId(userId: number, role: string) {
    let whereCondition;
    if (role === 'CONSUMER') {
      whereCondition = eq(orders.customerId, userId);
    } else if (role === 'MERCHANT') {
      whereCondition = eq(orders.merchantId, userId);
    } else if (role === 'DRIVER') {
      whereCondition = eq(orders.driverId, userId);
    }

    return await db.select().from(orders).where(whereCondition).orderBy(desc(orders.createdAt));
  },

  async updateOrderStatus(orderId: number, status: string) {
    const [order] = await db.update(orders).set({
      status: status as any,
      updatedAt: new Date()
    }).where(eq(orders.id, orderId)).returning();
    return order;
  },

  // Transaction operations
  async createTransaction(transactionData: any) {
    const [transaction] = await db.insert(transactions).values({
      ...transactionData,
      transactionRef: `TXN-${Date.now()}`
    }).returning();
    return transaction;
  },

  async getTransactionsByUserId(userId: number) {
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  },

  // Notification operations
  async createNotification(notificationData: any) {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  },

  async getNotificationsByUserId(userId: number) {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  },

  async markNotificationAsRead(notificationId: number) {
    const [notification] = await db.update(notifications).set({
      isRead: true
    }).where(eq(notifications.id, notificationId)).returning();
    return notification;
  },

  // Identity verification operations
  async createIdentityVerification(verificationData: any) {
    const [verification] = await db.insert(identityVerifications).values(verificationData).returning();
    return verification;
  },

  async getIdentityVerificationByUserId(userId: number) {
    const [verification] = await db.select().from(identityVerifications).where(eq(identityVerifications.userId, userId));
    return verification;
  },

  async updateIdentityVerificationStatus(verificationId: number, status: string, reviewedBy?: number, rejectionReason?: string) {
    const [verification] = await db.update(identityVerifications).set({
      verificationStatus: status as any,
      reviewedAt: new Date(),
      reviewedBy,
      rejectionReason
    }).where(eq(identityVerifications.id, verificationId)).returning();
    return verification;
  }
};
