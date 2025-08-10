
import { pgTable, serial, text, integer, timestamp, jsonb, boolean, decimal, pgEnum } from "drizzle-orm/pg-core";

// Define enums
export const roleEnum = pgEnum('role', ['CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN']);
export const verificationStatusEnum = pgEnum('verification_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password"),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: roleEnum("role").default('CONSUMER'),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  categoryName: text("category_name").notNull(),
  sellerId: integer("seller_id").references(() => users.id).notNull(),
  images: jsonb("images").default([]),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('0'),
  reviewCount: integer("review_count").default(0),
  inStock: boolean("in_stock").default(true),
  stockLevel: integer("stock_level").default(0),
  lowStockThreshold: integer("low_stock_threshold").default(10),
  isActive: boolean("is_active").default(true),
  totalSold: integer("total_sold").default(0),
  totalViews: integer("total_views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  icon: text("icon"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").unique().notNull(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  merchantId: integer("merchant_id").references(() => users.id),
  driverId: integer("driver_id").references(() => users.id),
  orderType: text("order_type").notNull(),
  status: orderStatusEnum("status").default('PENDING'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: text("delivery_address"),
  deliveryLatitude: decimal("delivery_latitude", { precision: 10, scale: 8 }),
  deliveryLongitude: decimal("delivery_longitude", { precision: 11, scale: 8 }),
  orderData: jsonb("order_data"),
  pickupAddress: text("pickup_address"),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }),
  urgentOrder: boolean("urgent_order").default(false),
  estimatedPreparationTime: integer("estimated_preparation_time"),
  notes: text("notes"),
  paymentStatus: text("payment_status").default('PENDING'),
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

// Fuel orders table
export const fuelOrders = pgTable("fuel_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  driverId: integer("driver_id").references(() => users.id),
  stationId: text("station_id").notNull(),
  fuelType: text("fuel_type").notNull(),
  quantity: decimal("quantity", { precision: 8, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLatitude: decimal("delivery_latitude", { precision: 10, scale: 8 }).notNull(),
  deliveryLongitude: decimal("delivery_longitude", { precision: 11, scale: 8 }).notNull(),
  scheduledDeliveryTime: timestamp("scheduled_delivery_time"),
  status: text("status").default('PENDING'),
  notes: text("notes"),
  estimatedDeliveryTime: text("estimated_delivery_time"),
  acceptedAt: timestamp("accepted_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Driver profiles table
export const driverProfiles = pgTable("driver_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  vehicleType: text("vehicle_type"),
  vehicleModel: text("vehicle_model"),
  plateNumber: text("plate_number"),
  licenseNumber: text("license_number"),
  isAvailable: boolean("is_available").default(true),
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 8 }),
  currentLongitude: decimal("current_longitude", { precision: 11, scale: 8 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('5.0'),
  totalTrips: integer("total_trips").default(0),
  earnings: decimal("earnings", { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Merchant profiles table
export const merchantProfiles = pgTable("merchant_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  businessName: text("business_name"),
  businessAddress: text("business_address"),
  businessLatitude: decimal("business_latitude", { precision: 10, scale: 8 }),
  businessLongitude: decimal("business_longitude", { precision: 11, scale: 8 }),
  businessType: text("business_type"),
  isOpen: boolean("is_open").default(true),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('5.0'),
  totalOrders: integer("total_orders").default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

// Identity verifications table
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

// Driver verifications table
export const driverVerifications = pgTable("driver_verifications", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
  licenseImageUrl: text("license_image_url"),
  vehicleRegistrationUrl: text("vehicle_registration_url"),
  insuranceUrl: text("insurance_url"),
  verificationStatus: verificationStatusEnum("verification_status").default('PENDING'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason")
});

// User locations table
export const userLocations = pgTable("user_locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  address: text("address"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Wallets table
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default('0'),
  currency: text("currency").default('NGN'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Payment methods table
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'card', 'bank', 'wallet'
  provider: text("provider"), // 'visa', 'mastercard', 'access_bank', etc.
  last4: text("last4"),
  expiryMonth: text("expiry_month"),
  expiryYear: text("expiry_year"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

// Escrow transactions table
export const escrowTransactions = pgTable("escrow_transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  merchantId: integer("merchant_id").references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default('NGN'),
  status: text("status").default('PENDING'), // 'PENDING', 'PAID', 'HELD', 'RELEASED', 'DISPUTED', 'REFUNDED'
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  escrowReleaseDate: timestamp("escrow_release_date"),
  releasedAt: timestamp("released_at"),
  releasedBy: integer("released_by").references(() => users.id),
  disputeId: integer("dispute_id"),
  failureReason: text("failure_reason"),
  customerDetails: jsonb("customer_details"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Admin users table
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").default('ADMIN'),
  permissions: jsonb("permissions").default([]),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Compliance documents table
export const complianceDocuments = pgTable("compliance_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  documentType: text("document_type").notNull(),
  documentUrl: text("document_url").notNull(),
  verificationStatus: verificationStatusEnum("verification_status").default('PENDING'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => adminUsers.id),
  expiryDate: timestamp("expiry_date"),
  notes: text("notes")
});

// Support tickets table
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  category: text("category"),
  priority: text("priority").default('MEDIUM'),
  status: text("status").default('OPEN'),
  assignedTo: integer("assigned_to").references(() => adminUsers.id),
  attachments: jsonb("attachments").default([]),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Content reports table
export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  reportedBy: integer("reported_by").references(() => users.id).notNull(),
  reportedUserId: integer("reported_user_id").references(() => users.id),
  reportedContentId: integer("reported_content_id"),
  contentType: text("content_type"), // 'USER', 'PRODUCT', 'ORDER', 'REVIEW'
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").default('PENDING'),
  reviewedBy: integer("reviewed_by").references(() => adminUsers.id),
  reviewedAt: timestamp("reviewed_at"),
  action: text("action"), // 'DISMISSED', 'WARNING', 'SUSPENSION', 'BAN'
  createdAt: timestamp("created_at").defaultNow()
});

// Moderation responses table
export const moderationResponses = pgTable("moderation_responses", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => contentReports.id).notNull(),
  moderatorId: integer("moderator_id").references(() => adminUsers.id).notNull(),
  action: text("action").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

// Vendor violations table
export const vendorViolations = pgTable("vendor_violations", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").references(() => users.id).notNull(),
  violationType: text("violation_type").notNull(),
  description: text("description").notNull(),
  severity: text("severity").default('MEDIUM'),
  status: text("status").default('ACTIVE'),
  reportedBy: integer("reported_by").references(() => users.id),
  reviewedBy: integer("reviewed_by").references(() => adminUsers.id),
  penaltyApplied: text("penalty_applied"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Admin payment actions table
export const adminPaymentActions = pgTable("admin_payment_actions", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id).notNull(),
  adminId: integer("admin_id").references(() => adminUsers.id).notNull(),
  actionType: text("action_type").notNull(), // 'REFUND', 'RELEASE', 'HOLD', 'DISPUTE_RESOLVE'
  amount: decimal("amount", { precision: 10, scale: 2 }),
  reason: text("reason").notNull(),
  status: text("status").default('PENDING'),
  processedAt: timestamp("processed_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

// Fraud alerts table
export const fraudAlerts = pgTable("fraud_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  alertType: text("alert_type").notNull(),
  severity: text("severity").default('MEDIUM'),
  description: text("description").notNull(),
  data: jsonb("data"),
  status: text("status").default('PENDING'),
  reviewedBy: integer("reviewed_by").references(() => adminUsers.id),
  reviewedAt: timestamp("reviewed_at"),
  action: text("action"),
  createdAt: timestamp("created_at").defaultNow()
});

// Suspicious activities table
export const suspiciousActivities = pgTable("suspicious_activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  activityType: text("activity_type").notNull(),
  description: text("description").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  riskScore: integer("risk_score"),
  metadata: jsonb("metadata"),
  flagged: boolean("flagged").default(false),
  reviewedBy: integer("reviewed_by").references(() => adminUsers.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Account flags table
export const accountFlags = pgTable("account_flags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  flagType: text("flag_type").notNull(),
  reason: text("reason").notNull(),
  severity: text("severity").default('MEDIUM'),
  isActive: boolean("is_active").default(true),
  flaggedBy: integer("flagged_by").references(() => adminUsers.id),
  resolvedBy: integer("resolved_by").references(() => adminUsers.id),
  resolvedAt: timestamp("resolved_at"),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

// Delivery requests table
export const deliveryRequests = pgTable("delivery_requests", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  merchantId: integer("merchant_id").references(() => users.id).notNull(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  driverId: integer("driver_id").references(() => users.id),
  deliveryType: text("delivery_type").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  pickupLatitude: decimal("pickup_latitude", { precision: 10, scale: 8 }),
  pickupLongitude: decimal("pickup_longitude", { precision: 11, scale: 8 }),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLatitude: decimal("delivery_latitude", { precision: 10, scale: 8 }),
  deliveryLongitude: decimal("delivery_longitude", { precision: 11, scale: 8 }),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  distance: decimal("distance", { precision: 8, scale: 2 }),
  estimatedTime: integer("estimated_time"),
  orderValue: decimal("order_value", { precision: 10, scale: 2 }),
  urgentDelivery: boolean("urgent_delivery").default(false),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  merchantName: text("merchant_name"),
  status: text("status").default('PENDING'),
  acceptedAt: timestamp("accepted_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Vendor posts table
export const vendorPosts = pgTable("vendor_posts", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  images: jsonb("images").default([]),
  postType: text("post_type").default('GENERAL'), // 'PRODUCT', 'PROMOTION', 'ANNOUNCEMENT', 'GENERAL'
  isActive: boolean("is_active").default(true),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  views: integer("views").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Chat conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participantIds: jsonb("participant_ids").notNull(), // Array of user IDs
  conversationType: text("conversation_type").default('DIRECT'), // 'DIRECT', 'GROUP', 'SUPPORT'
  title: text("title"),
  isActive: boolean("is_active").default(true),
  lastMessageId: integer("last_message_id"),
  lastMessageAt: timestamp("last_message_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  messageType: text("message_type").default('TEXT'), // 'TEXT', 'IMAGE', 'LOCATION', 'ORDER', 'PAYMENT'
  content: text("content"),
  attachments: jsonb("attachments").default([]),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  readBy: jsonb("read_by").default([]), // Array of user IDs who have read the message
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Export types for TypeScript
export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Add validation schemas for forms (basic exports for compatibility)
import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type SignInData = z.infer<typeof signInSchema>;
