
import { pgTable, serial, text, integer, timestamp, jsonb, boolean, decimal, pgEnum } from "drizzle-orm/pg-core";

// Define enums
export const roleEnum = pgEnum('role', ['CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN']);
export const verificationStatusEnum = pgEnum('verification_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'CONFIRMED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);
export const transactionTypeEnum = pgEnum('transaction_type', ['WALLET_FUNDING', 'PAYMENT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'DELIVERY_EARNINGS', 'REFUND']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password"),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  profilePicture: text("profile_picture"),
  role: roleEnum("role").default('CONSUMER'),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: text("price").notNull(), // Stored as string to avoid precision issues
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  stockQuantity: integer("stock_quantity").default(0),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
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
  totalAmount: text("total_amount").notNull(), // Stored as string
  driverEarnings: text("driver_earnings"), // Driver's share
  deliveryAddress: text("delivery_address"),
  deliveryLatitude: text("delivery_latitude"),
  deliveryLongitude: text("delivery_longitude"),
  orderData: jsonb("order_data"), // Store order-specific data
  acceptedAt: timestamp("accepted_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Wallets table
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  balance: text("balance").default('0'), // Stored as string
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  orderId: integer("order_id").references(() => orders.id),
  recipientId: integer("recipient_id").references(() => users.id),
  amount: text("amount").notNull(), // Stored as string
  netAmount: text("net_amount"), // Amount after fees
  currency: text("currency").default('NGN'),
  type: transactionTypeEnum("type").notNull(),
  status: text("status").default('PENDING'),
  paymentMethod: text("payment_method"),
  paymentStatus: paymentStatusEnum("payment_status").default('PENDING'),
  transactionRef: text("transaction_ref").unique(),
  paymentGatewayRef: text("payment_gateway_ref"),
  paystackTransactionId: text("paystack_transaction_id"),
  description: text("description"),
  metadata: jsonb("metadata"),
  initiatedAt: timestamp("initiated_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Driver Profiles table
export const driverProfiles = pgTable("driver_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  vehicleType: text("vehicle_type"), // 'motorcycle', 'car', 'van', 'truck'
  vehiclePlate: text("vehicle_plate"),
  vehicleModel: text("vehicle_model"),
  vehicleColor: text("vehicle_color"),
  isOnline: boolean("is_online").default(false),
  isAvailable: boolean("is_available").default(true),
  currentLocation: text("current_location"), // JSON string of coordinates
  rating: text("rating").default('0'),
  totalDeliveries: integer("total_deliveries").default(0),
  totalEarnings: text("total_earnings").default('0'),
  verificationStatus: verificationStatusEnum("verification_status").default('PENDING'),
  tier: text("tier").default('STANDARD'), // 'STANDARD', 'PREMIUM', 'ELITE'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Merchant Profiles table
export const merchantProfiles = pgTable("merchant_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  businessName: text("business_name").notNull(),
  businessAddress: text("business_address"),
  businessType: text("business_type"),
  businessPhone: text("business_phone"),
  businessEmail: text("business_email"),
  isOpen: boolean("is_open").default(true),
  isVerified: boolean("is_verified").default(false),
  rating: text("rating").default('0'),
  totalOrders: integer("total_orders").default(0),
  revenue: text("revenue").default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Fuel Orders table
export const fuelOrders = pgTable("fuel_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  driverId: integer("driver_id").references(() => users.id),
  stationId: text("station_id").notNull(),
  fuelType: text("fuel_type").notNull(), // 'PMS', 'AGO', 'DPK'
  quantity: text("quantity").notNull(),
  unitPrice: text("unit_price").notNull(),
  totalAmount: text("total_amount").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLatitude: text("delivery_latitude"),
  deliveryLongitude: text("delivery_longitude"),
  status: orderStatusEnum("status").default('PENDING'),
  scheduledDeliveryTime: text("scheduled_delivery_time"),
  acceptedAt: timestamp("accepted_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  estimatedDeliveryTime: text("estimated_delivery_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Ratings table
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  driverId: integer("driver_id").references(() => users.id),
  merchantId: integer("merchant_id").references(() => users.id),
  productId: text("product_id"),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
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

// Validation schemas for API requests
import { z } from 'zod';

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN']).default('CONSUMER')
});

export const insertProductSchema = z.object({
  merchantId: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string().min(1),
  unit: z.string().min(1),
  stockQuantity: z.number().min(0).default(0),
  imageUrl: z.string().url().optional()
});

export const insertOrderSchema = z.object({
  customerId: z.number(),
  merchantId: z.number().optional(),
  orderType: z.string(),
  totalAmount: z.number().positive(),
  deliveryAddress: z.string().min(1),
  orderData: z.any().optional()
});

export const insertFuelOrderSchema = z.object({
  customerId: z.number(),
  stationId: z.string(),
  fuelType: z.enum(['PMS', 'AGO', 'DPK']),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  totalAmount: z.number().positive(),
  deliveryAddress: z.string().min(1),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  scheduledDeliveryTime: z.string().optional()
});

export const insertTransactionSchema = z.object({
  userId: z.number(),
  amount: z.number().positive(),
  type: z.enum(['WALLET_FUNDING', 'PAYMENT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'DELIVERY_EARNINGS', 'REFUND']),
  paymentMethod: z.string(),
  description: z.string().optional()
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type DriverProfile = typeof driverProfiles.$inferSelect;
export type NewDriverProfile = typeof driverProfiles.$inferInsert;
export type MerchantProfile = typeof merchantProfiles.$inferSelect;
export type NewMerchantProfile = typeof merchantProfiles.$inferInsert;
export type FuelOrder = typeof fuelOrders.$inferSelect;
export type NewFuelOrder = typeof fuelOrders.$inferInsert;
export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;
