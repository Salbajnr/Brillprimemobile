import { pgTable, serial, text, integer, timestamp, jsonb, boolean, decimal, pgEnum, varchar, numeric, json } from "drizzle-orm/pg-core";

// Define enums
export const roleEnum = pgEnum('role', ['CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN']);
export const verificationStatusEnum = pgEnum('verification_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'CONFIRMED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);
export const transactionTypeEnum = pgEnum('transaction_type', ['WALLET_FUNDING', 'PAYMENT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'DELIVERY_EARNINGS', 'REFUND']);
export const kycStatusEnum = pgEnum('kyc_status', ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_RESUBMISSION']);
export const driverTierEnum = pgEnum('driver_tier', ['STANDARD', 'PREMIUM', 'ELITE']);
export const supportStatusEnum = pgEnum('support_status', ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  passwordHash: text("password_hash"),
  profilePicture: text("profile_picture"),
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  dateOfBirth: timestamp("date_of_birth"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country"),
  referralCode: varchar("referral_code"),
  referredBy: integer("referred_by"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaMethod: varchar("mfa_method"),
  mfaSecret: text("mfa_secret"),
  mfaBackupCodes: jsonb("mfa_backup_codes"),
  biometricHash: text("biometric_hash"),
  biometricType: varchar("biometric_type"),
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").default(0),
  accountLockedUntil: timestamp("account_locked_until")
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Products table  
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").references(() => users.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  image: text("image"),
  inStock: boolean("in_stock").default(true),
  minimumOrder: integer("minimum_order").default(1),
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
  orderType: text("order_type").notNull(),
  status: orderStatusEnum("status").default('PENDING'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: text("delivery_address"),
  orderData: jsonb("order_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Wallets table
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  balance: decimal("balance", { precision: 15, scale: 2 }).default('0.00'),
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
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }),
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
  vehicleType: varchar("vehicle_type", { length: 50 }),
  vehiclePlate: varchar("vehicle_plate", { length: 20 }),
  vehicleModel: varchar("vehicle_model", { length: 100 }),
  vehicleColor: text("vehicle_color"),
  licenseNumber: text("license_number"),
  vehicleRegistration: text("vehicle_registration"),
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 8 }),
  currentLongitude: decimal("current_longitude", { precision: 11, scale: 8 }),
  isOnline: boolean("is_online").default(false),
  isAvailable: boolean("is_available").default(true),
  currentLocation: text("current_location"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('0.00'),
  totalRatings: integer("total_ratings").default(0),
  totalDeliveries: integer("total_deliveries").default(0),
  totalEarnings: decimal("total_earnings", { precision: 15, scale: 2 }).default('0.00'),
  averageDeliveryTime: integer("average_delivery_time"), // in minutes
  verificationStatus: verificationStatusEnum("verification_status").default('PENDING'),
  tier: driverTierEnum("tier").default('STANDARD'),
  kycData: jsonb("kyc_data"),
  kycStatus: kycStatusEnum("kyc_status").default('PENDING'),
  kycSubmittedAt: timestamp("kyc_submitted_at"),
  kycApprovedAt: timestamp("kyc_approved_at"),
  kycApprovedBy: integer("kyc_approved_by").references(() => users.id),
  verificationLevel: text("verification_level").default('BASIC'),
  backgroundCheckStatus: text("background_check_status").default('PENDING'),
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
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  phone: text("phone"),
  description: text("description"),
  operatingHours: jsonb("operating_hours"),
  isOpen: boolean("is_open").default(true),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('0.00'),
  totalOrders: integer("total_orders").default(0),
  revenue: decimal("revenue", { precision: 15, scale: 2 }).default('0.00'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Fuel Orders table
export const fuelOrders = pgTable("fuel_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  driverId: integer("driver_id").references(() => users.id),
  stationId: text("station_id").notNull(),
  fuelType: text("fuel_type").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLatitude: decimal("delivery_latitude", { precision: 10, scale: 8 }),
  deliveryLongitude: decimal("delivery_longitude", { precision: 11, scale: 8 }),
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
  customerId: integer("customer_id").references(() => users.id),
  orderId: integer("order_id").references(() => orders.id),
  driverId: integer("driver_id").references(() => users.id),
  merchantId: integer("merchant_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliveryFeedback = pgTable("delivery_feedback", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
  feedbackType: varchar("feedback_type", { length: 50 }).notNull(), // CUSTOMER_TO_DRIVER, DRIVER_TO_CUSTOMER

  // Customer ratings
  driverRating: integer("driver_rating"),
  serviceRating: integer("service_rating"),
  deliveryTimeRating: integer("delivery_time_rating"),
  deliveryQuality: varchar("delivery_quality", { length: 20 }), // EXCELLENT, GOOD, AVERAGE, POOR
  wouldRecommend: boolean("would_recommend"),
  issuesReported: text("issues_reported"),

  // Driver feedback
  customerRating: integer("customer_rating"),
  deliveryComplexity: varchar("delivery_complexity", { length: 20 }), // EASY, MODERATE, DIFFICULT
  customerCooperation: varchar("customer_cooperation", { length: 20 }), // EXCELLENT, GOOD, AVERAGE, POOR
  paymentIssues: boolean("payment_issues"),

  // Common fields
  comment: text("comment"),
  additionalFeedback: text("additional_feedback"),
  createdAt: timestamp("created_at").defaultNow(),
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

// MFA Tokens table
export const mfaTokens = pgTable("mfa_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull(),
  method: text("method").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Verification Documents table
export const verificationDocuments = pgTable("verification_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number"),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  expiryDate: timestamp("expiry_date"),
  status: text("status").default('PENDING'),
  validationScore: decimal("validation_score", { precision: 3, scale: 2 }),
  extractedData: jsonb("extracted_data"),
  rejectionReason: text("rejection_reason"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Security Logs table
export const securityLogs = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  severity: text("severity").default('INFO'),
  timestamp: timestamp("timestamp").defaultNow()
});

// Trusted Devices table
export const trustedDevices = pgTable("trusted_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  deviceToken: text("device_token").unique().notNull(),
  deviceName: text("device_name"),
  deviceType: text("device_type"),
  browserInfo: text("browser_info"),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Support Tickets table
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  priority: text("priority").default('MEDIUM'),
  status: supportStatusEnum("status").default('OPEN'),
  assignedTo: integer("assigned_to").references(() => users.id),
  attachments: jsonb("attachments"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Chat Messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  orderId: integer("order_id").references(() => orders.id),
  supportTicketId: integer("support_ticket_id").references(() => supportTickets.id),
  message: text("message").notNull(),
  messageType: text("message_type").default('TEXT'),
  attachments: jsonb("attachments"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Toll Gates table
export const tollGates = pgTable("toll_gates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  operatingHours: jsonb("operating_hours"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Suspicious Activities table
export const suspiciousActivities = pgTable("suspicious_activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  activityType: text("activity_type").notNull(),
  description: text("description").notNull(),
  riskIndicators: jsonb("risk_indicators"),
  timestamp: timestamp("timestamp").defaultNow(),
  ipAddress: text("ip_address"),
  deviceFingerprint: text("device_fingerprint"),
  severity: text("severity").default('MEDIUM')
});

// Fraud Alerts table
export const fraudAlerts = pgTable("fraud_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  alertType: text("alert_type").notNull(),
  description: text("description").notNull(),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  status: text("status").default('ACTIVE'),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Admin Users table
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").default('ADMIN'),
  permissions: jsonb("permissions").default('[]'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Compliance Documents table
export const complianceDocuments = pgTable("compliance_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  documentType: text("document_type").notNull(),
  documentUrl: text("document_url").notNull(),
  status: text("status").default('PENDING'),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Content Reports table
export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(),
  contentId: text("content_id").notNull(),
  reportedBy: integer("reported_by").references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status").default('PENDING'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Moderation Responses table
export const moderationResponses = pgTable("moderation_responses", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => contentReports.id).notNull(),
  adminId: integer("admin_id").references(() => adminUsers.id).notNull(),
  response: text("response").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// User Locations table
export const userLocations = pgTable("user_locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  heading: decimal("heading", { precision: 5, scale: 2 }),
  speed: decimal("speed", { precision: 8, scale: 2 }),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }),
  locationType: text("location_type"),
  timestamp: timestamp("timestamp").defaultNow(),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Payment Methods table
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  details: jsonb("details").notNull(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Admin Payment Actions table
export const adminPaymentActions = pgTable("admin_payment_actions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => adminUsers.id).notNull(),
  action: text("action").notNull(),
  paymentId: text("payment_id").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow()
});

// Account Flags table
export const accountFlags = pgTable("account_flags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  flagType: text("flag_type").notNull(),
  severity: text("severity").default('MEDIUM'),
  reason: text("reason").notNull(),
  flaggedBy: integer("flagged_by").references(() => adminUsers.id),
  status: text("status").default('ACTIVE'),
  resolvedBy: integer("resolved_by").references(() => adminUsers.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  status: text("status").default('ACTIVE'),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Driver Verifications table
export const driverVerifications = pgTable("driver_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  documentType: text("document_type").notNull(),
  documentUrl: text("document_url").notNull(),
  status: verificationStatusEnum("status").default('PENDING'),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Audit Logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  oldValues: text("old_values"),
  newValues: text("new_values"),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent").notNull(),
  sessionId: text("session_id"),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

// Order Tracking table
export const orderTracking = pgTable("order_tracking", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  driverId: integer("driver_id").references(() => users.id),
  status: text("status").notNull(),
  location: text("location"),
  notes: text("notes"),
  estimatedArrival: timestamp("estimated_arrival"),
  timestamp: timestamp("timestamp").defaultNow()
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
  type: z.enum(['Wallet_FUNDING', 'PAYMENT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'DELIVERY_EARNINGS', 'REFUND']),
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
export type DeliveryFeedback = typeof deliveryFeedback.$inferSelect;
export type NewDeliveryFeedback = typeof deliveryFeedback.$inferInsert;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;