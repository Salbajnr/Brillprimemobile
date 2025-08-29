import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal, jsonb, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';

// Define enums
export const roleEnum = pgEnum('role', ['CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN']);
export const verificationStatusEnum = pgEnum('verification_status', ['PENDING', 'APPROVED', 'REJECTED', 'VERIFIED']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);

// Users table (Enhanced)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").default('CONSUMER'),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

  // Enhanced security fields
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  dateOfBirth: timestamp("date_of_birth"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).default("Nigeria"),
  referralCode: varchar("referral_code", { length: 20 }).unique(),
  referredBy: integer("referred_by").references(() => users.id),

  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaMethod: varchar("mfa_method", { length: 10 }), // SMS, EMAIL, TOTP
  mfaSecret: text("mfa_secret"),
  mfaBackupCodes: jsonb("mfa_backup_codes"),
  biometricHash: text("biometric_hash"),
  biometricType: varchar("biometric_type", { length: 20 }), // FACE, FINGERPRINT

  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").default(0),
  accountLockedUntil: timestamp("account_locked_until"),
  
  // Additional missing fields
  userId: varchar("user_id", { length: 50 }).unique(),
  password: text("password").notNull(),
  isIdentityVerified: boolean("is_identity_verified").default(false),
  accountStatus: varchar("account_status", { length: 20 }).default("ACTIVE"),
  lastActivity: timestamp("last_activity"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  phoneIdx: index("users_phone_idx").on(table.phone),
  userIdIdx: index("users_user_id_idx").on(table.userId),
}));

// MFA tokens table
export const mfaTokens = pgTable("mfa_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull(), // Hashed token
  method: varchar("method", { length: 10 }).notNull(), // SMS, EMAIL, TOTP
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Enhanced verification documents table
export const verificationDocuments = pgTable("verification_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  documentType: varchar("document_type", { length: 30 }).notNull(), // LICENSE, NIN, PASSPORT, etc.
  documentNumber: varchar("document_number", { length: 50 }),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  status: verificationStatusEnum("status").default('PENDING'), // PENDING, VERIFIED, REJECTED - using enum from original
  validationScore: decimal("validation_score", { precision: 3, scale: 2 }),
  extractedData: jsonb("extracted_data"),
  rejectionReason: text("rejection_reason"),
  reviewedBy: integer("reviewed_by").references(() => users.id), // Changed from adminUsers.id in original snippet to users.id to match pattern
  reviewedAt: timestamp("reviewed_at"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Security logs table
export const securityLogs = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  severity: varchar("severity", { length: 20 }).default("INFO"), // INFO, WARNING, ERROR, CRITICAL
  timestamp: timestamp("timestamp").defaultNow()
});

// Trusted devices table
export const trustedDevices = pgTable("trusted_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  deviceToken: text("device_token").unique().notNull(),
  deviceName: varchar("device_name", { length: 100 }),
  deviceType: varchar("device_type", { length: 50 }), // mobile, desktop, tablet
  browserInfo: text("browser_info"),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Products table (from original, unchanged)
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

// Categories table (legacy - kept for migration compatibility)
export const categoriesLegacy = pgTable("categories_legacy", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  icon: text("icon"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Orders table (from original, unchanged)
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
  
  // Additional missing fields
  buyerId: integer("buyer_id").references(() => users.id),
  sellerId: integer("seller_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  quantity: integer("quantity").default(1),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  customerIdIdx: index("orders_customer_id_idx").on(table.customerId),
  merchantIdIdx: index("orders_merchant_id_idx").on(table.merchantId),
  driverIdIdx: index("orders_driver_id_idx").on(table.driverId),
  statusIdx: index("orders_status_idx").on(table.status),
  createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
}));

// Transactions table (from original, unchanged)
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
  
  // Additional missing fields
  recipientId: integer("recipient_id").references(() => users.id),
  walletId: integer("wallet_id").references(() => wallets.id),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id),
  type: varchar("type", { length: 50 }).default("PAYMENT"),
  status: varchar("status", { length: 20 }).default("PENDING"),
  fee: decimal("fee", { precision: 10, scale: 2 }).default('0'),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }),
  paystackReference: text("paystack_reference"),
  paystackTransactionId: text("paystack_transaction_id"),
  gatewayResponse: jsonb("gateway_response"),
  description: text("description"),
  channel: varchar("channel", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  userIdIdx: index("transactions_user_id_idx").on(table.userId),
  statusIdx: index("transactions_status_idx").on(table.status),
  transactionRefIdx: index("transactions_ref_idx").on(table.transactionRef),
  createdAtIdx: index("transactions_created_at_idx").on(table.createdAt),
}));

// QR Payment Receipts table - QR codes for consumer receipts that merchants can scan
export const qrPaymentReceipts = pgTable("qr_payment_receipts", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id).notNull(),
  consumerId: integer("consumer_id").references(() => users.id).notNull(),
  merchantId: integer("merchant_id").references(() => users.id).notNull(),
  qrCode: text("qr_code").unique().notNull(), // Unique QR code for the receipt
  receiptNumber: text("receipt_number").unique().notNull(), // Human-readable receipt number
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default('NGN'),
  paymentMethod: text("payment_method").notNull(),
  serviceType: text("service_type").notNull(), // 'DELIVERY', 'FUEL', 'TOLL', 'TRANSFER'
  status: text("status").default('ACTIVE'), // 'ACTIVE', 'SCANNED', 'EXPIRED', 'VOIDED'
  scannedAt: timestamp("scanned_at"),
  scannedBy: integer("scanned_by").references(() => users.id), // Merchant who scanned
  expiresAt: timestamp("expires_at"), // Optional expiry for time-sensitive receipts
  metadata: jsonb("metadata"), // Additional receipt details, order info, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// QR Receipt Scans table - Track when and who scans QR receipts
export const qrReceiptScans = pgTable("qr_receipt_scans", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id").references(() => qrPaymentReceipts.id).notNull(),
  scannedBy: integer("scanned_by").references(() => users.id).notNull(), // Who scanned it
  scanType: text("scan_type").default('VERIFICATION'), // 'VERIFICATION', 'TRACKING', 'AUDIT'
  location: text("location"), // Where it was scanned
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  deviceInfo: text("device_info"), // Device/browser info
  ipAddress: text("ip_address"),
  scanResult: text("scan_result").default('SUCCESS'), // 'SUCCESS', 'INVALID', 'EXPIRED'
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

// Fuel orders table (from original, unchanged)
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

// Driver profiles table (Enhanced)
export const driverProfiles = pgTable("driver_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  vehicleType: text("vehicle_type"),
  vehicleModel: text("vehicle_model"),
  plateNumber: text("plate_number"),
  licenseNumber: text("license_number"),
  licenseExpiry: timestamp("license_expiry"),
  vehicleYear: integer("vehicle_year"),
  vehicleColor: varchar("vehicle_color", { length: 30 }),
  isAvailable: boolean("is_available").default(true),
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 8 }),
  currentLongitude: decimal("current_longitude", { precision: 11, scale: 8 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('5.00'),
  totalTrips: integer("total_trips").default(0),
  earnings: decimal("earnings", { precision: 10, scale: 2 }).default('0.00'),
  kycData: jsonb("kyc_data"),
  kycStatus: varchar("kyc_status", { length: 20 }).default("PENDING"),
  kycSubmittedAt: timestamp("kyc_submitted_at"),
  kycApprovedAt: timestamp("kyc_approved_at"),
  kycApprovedBy: integer("kyc_approved_by").references(() => users.id),
  verificationLevel: varchar("verification_level", { length: 20 }).default("BASIC"), // BASIC, STANDARD, PREMIUM
  backgroundCheckStatus: varchar("background_check_status", { length: 20 }).default("PENDING"),
  
  // Additional missing fields
  vehiclePlate: text("vehicle_plate"),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  currentLocation: text("current_location"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  userIdIdx: index("driver_profiles_user_id_idx").on(table.userId),
  availableIdx: index("driver_profiles_available_idx").on(table.isAvailable),
}));

// Merchant profiles table (from original, unchanged)
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
  
  // Additional missing fields
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  businessRegistrationNumber: varchar("business_registration_number", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  userIdIdx: index("merchant_profiles_user_id_idx").on(table.userId),
  businessNameIdx: index("merchant_profiles_business_name_idx").on(table.businessName),
}));

// Notifications table (from original, unchanged) - This is a duplicate, will be replaced by the new one below.
// export const notifications = pgTable("notifications", {
//   id: serial("id").primaryKey(),
//   userId: integer("user_id").references(() => users.id).notNull(),
//   title: text("title").notNull(),
//   message: text("message").notNull(),
//   type: text("type").notNull(),
//   isRead: boolean("is_read").default(false),
//   metadata: jsonb("metadata"),
//   createdAt: timestamp("created_at").defaultNow()
// });

// Identity verifications table (from original, unchanged)
export const identityVerifications = pgTable("identity_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number").notNull(),
  documentImageUrl: text("document_image_url"),
  verificationStatus: verificationStatusEnum("verification_status").default('PENDING'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id), // Changed from original user.id to match snippet's context for reviewedBy
  rejectionReason: text("rejection_reason")
});

// Driver verifications table (from original, unchanged)
export const driverVerifications = pgTable("driver_verifications", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
  licenseImageUrl: text("license_image_url"),
  vehicleRegistrationUrl: text("vehicle_registration_url"),
  insuranceUrl: text("insurance_url"),
  verificationStatus: verificationStatusEnum("verification_status").default('PENDING'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id), // Changed from original user.id to match snippet's context for reviewedBy
  rejectionReason: text("rejection_reason")
});

// User locations table (from original, unchanged)
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

// Order tracking table
export const orderTracking = pgTable("order_tracking", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  driverId: integer("driver_id").references(() => users.id),
  status: orderStatusEnum("status").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  address: text("address"),
  notes: text("notes"),
  estimatedArrival: timestamp("estimated_arrival"),
  actualArrival: timestamp("actual_arrival"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Wallets table (from original, unchanged)
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default('0'),
  currency: text("currency").default('NGN'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Payment methods table (from original, unchanged)
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

// Escrow transactions table (from original, unchanged)
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

// Admin users table (from original, unchanged)
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

// Compliance documents table (from original, unchanged)
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

// Content reports table (from original, unchanged)
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

// Moderation responses table (from original, unchanged)
export const moderationResponses = pgTable("moderation_responses", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => contentReports.id).notNull(),
  moderatorId: integer("moderator_id").references(() => adminUsers.id).notNull(),
  action: text("action").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

// Vendor violations table (from original, unchanged)
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

// Admin payment actions table (from original, unchanged)
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

// Fraud alerts table (from original, unchanged)
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

// Suspicious activities table (from original, unchanged)
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

// Account flags table (from original, unchanged)
export const accountFlags = pgTable('account_flags', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  flagType: text('flag_type').notNull(),
  reason: text('reason').notNull(),
  severity: text('severity').default('MEDIUM'),
  isActive: boolean('is_active').default(true),
  flaggedBy: integer('flagged_by').references(() => adminUsers.id),
  resolvedBy: integer('resolved_by').references(() => adminUsers.id),
  resolvedAt: timestamp('resolved_at'),
  expiresAt: timestamp('expires_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow()
});

// Delivery requests table (from original, unchanged)
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

// Vendor posts table (from original, unchanged)
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

// Chat conversations table (from original, unchanged)
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

// Chat messages table (from original, unchanged)
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

// Toll Gates table (from original, unchanged)
export const tollGates = pgTable('toll_gates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  qrCode: varchar('qr_code', { length: 255 }).unique().notNull(),
  tariff: decimal('tariff', { precision: 10, scale: 2 }).notNull(),
  operationalHours: varchar('operational_hours', { length: 100 }),
  status: varchar('status', { length: 20 }).default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Support tickets table (from original, unchanged)
export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  ticketNumber: varchar('ticket_number', { length: 20 }).unique().notNull(),
  userId: integer('user_id').references(() => users.id),
  userRole: varchar('user_role', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 20 }).default('OPEN'), // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  priority: varchar('priority', { length: 20 }).default('NORMAL'), // LOW, NORMAL, HIGH, URGENT
  assignedTo: integer('assigned_to').references(() => adminUsers.id),
  adminNotes: text('admin_notes'),
  resolution: text('resolution'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  resolvedAt: timestamp('resolved_at')
});

// Support responses table (from original, unchanged)
export const supportResponses = pgTable('support_responses', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').references(() => supportTickets.id).notNull(),
  responderId: integer('responder_id').notNull(),
  responderType: varchar('responder_type', { length: 20 }).notNull(), // ADMIN, USER
  message: text('message').notNull(),
  attachments: text('attachments'), // JSON array of file URLs
  createdAt: timestamp('created_at').defaultNow()
});

// Audit Logs table (New)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  oldValues: text('old_values'),
  newValues: text('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  userAgent: text('user_agent'),
  sessionId: varchar('session_id', { length: 255 }),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Push Tokens table (New)
export const pushTokens = pgTable('push_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  token: text('token').notNull(),
  platform: varchar('platform', { length: 10 }).notNull(), // 'ios', 'android', 'web'
  deviceInfo: text('device_info'),
  isActive: boolean('is_active').default(true).notNull(),
  lastUsed: timestamp('last_used').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Notifications table (New)
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  category: varchar('category', { length: 50 }).default('general').notNull(),
  data: text('data'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Categories table (New)
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  parentId: integer('parent_id'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Analytics tables
export const userBehaviorTracking = pgTable('user_behavior_tracking', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  userRole: text('user_role').notNull(),
  sessionId: text('session_id').notNull(),
  eventType: text('event_type').notNull(),
  eventCategory: text('event_category').notNull(),
  eventAction: text('event_action').notNull(),
  eventLabel: text('event_label'),
  eventValue: decimal('event_value'),
  pagePath: text('page_path'),
  pageTitle: text('page_title'),
  referrer: text('referrer'),
  deviceType: text('device_type'),
  browserName: text('browser_name'),
  operatingSystem: text('operating_system'),
  screenResolution: text('screen_resolution'),
  ipAddress: text('ip_address'),
  country: text('country'),
  city: text('city'),
  networkType: text('network_type'),
  duration: integer('duration'),
  customDimensions: jsonb('custom_dimensions'),
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp').defaultNow(),
  createdAt: timestamp('created_at').defaultNow()
});

export const personalizationProfiles = pgTable('personalization_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  preferredCategories: jsonb('preferred_categories'),
  peakActivityHours: jsonb('peak_activity_hours'),
  averageOrderValue: decimal('average_order_value'),
  churnRisk: decimal('churn_risk'),
  lastUpdated: timestamp('last_updated').defaultNow(),
  createdAt: timestamp('created_at').defaultNow()
});

export const crossRoleInteractions = pgTable('cross_role_interactions', {
  id: text('id').primaryKey(),
  initiatorId: integer('initiator_id').notNull(),
  initiatorRole: text('initiator_role').notNull(),
  targetId: integer('target_id').notNull(),
  targetRole: text('target_role').notNull(),
  interactionType: text('interaction_type').notNull(),
  interactionStatus: text('interaction_status').default('INITIATED'),
  relatedOrderId: text('related_order_id'),
  relatedChatId: text('related_chat_id'),
  outcome: text('outcome'),
  workflowStage: text('workflow_stage'),
  nextAction: text('next_action'),
  satisfactionRating: integer('satisfaction_rating'),
  duration: integer('duration'),
  metadata: jsonb('metadata'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const systemMetrics = pgTable('system_metrics', {
  id: serial('id').primaryKey(),
  metricType: text('metric_type').notNull(),
  metricName: text('metric_name').notNull(),
  metricCategory: text('metric_category').notNull(),
  value: decimal('value').notNull(),
  unit: text('unit'),
  dimensions: jsonb('dimensions'),
  tags: jsonb('tags'),
  aggregationType: text('aggregation_type').default('COUNT'),
  timeWindow: text('time_window'),
  source: text('source'),
  environment: text('environment').default('production'),
  version: text('version'),
  createdAt: timestamp('created_at').defaultNow()
});

// Export types for TypeScript
export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Add validation schemas for forms (basic exports for compatibility)
export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type SignInData = z.infer<typeof signInSchema>;

// Categories schema (new schema definition)
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  parentId: z.number().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  createdBy: z.number().optional(),
  updatedBy: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Categories lookup
export const categoryTypes = {
  FUEL: 'Fuel Services',
  TOLL: 'Toll Payments',
  COMMODITY: 'Commodities',
  BILL_PAYMENT: 'Bill Payments'
} as const;

export const categoryList = [
  { id: 'fuel', name: 'Fuel Services', icon: 'fuel', color: '#FF6B6B' },
  { id: 'toll', name: 'Toll Payments', icon: 'toll', color: '#4ECDC4' },
  { id: 'commodity', name: 'Commodities', icon: 'shopping', color: '#45B7D1' },
  { id: 'bills', name: 'Bill Payments', icon: 'receipt', color: '#96CEB4' },
  { id: 'transfer', name: 'Money Transfer', icon: 'send', color: '#FECA57' },
] as const;

// Insert schemas for forms
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  rating: true,
  reviewCount: true,
  totalSold: true,
  totalViews: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  loginAttempts: true,
  accountLockedUntil: true
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  orderNumber: true
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true
});

export const insertFuelOrderSchema = createInsertSchema(fuelOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  acceptedAt: true,
  pickedUpAt: true,
  deliveredAt: true
});

export const insertQrPaymentReceiptSchema = createInsertSchema(qrPaymentReceipts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertQrReceiptScanSchema = createInsertSchema(qrReceiptScans).omit({
  id: true,
  createdAt: true
});

// Insert types
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertFuelOrder = z.infer<typeof insertFuelOrderSchema>;

// QR Receipt type definitions
export type QrPaymentReceipt = typeof qrPaymentReceipts.$inferSelect;
export type InsertQrPaymentReceipt = z.infer<typeof insertQrPaymentReceiptSchema>;

export type QrReceiptScan = typeof qrReceiptScans.$inferSelect;
export type InsertQrReceiptScan = z.infer<typeof insertQrReceiptScanSchema>;