import { pgTable, varchar, text, timestamp, boolean, integer, decimal, uuid, serial, json, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Admin-specific tables
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  role: text("role", { enum: ["ADMIN", "SUPER_ADMIN", "SUPPORT", "MODERATOR"] }).notNull(),
  permissions: json("permissions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const adminPaymentActions = pgTable("admin_payment_actions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => adminUsers.id),
  action: text("action", { 
    enum: ["REFUND", "HOLD", "RELEASE", "CANCEL", "REVERSE", "APPROVE", "REJECT"] 
  }).notNull(),
  paymentId: uuid("payment_id").notNull(),
  details: json("details"), // Store action-specific details
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliveryConfirmations = pgTable("delivery_confirmations", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  qrCode: text("qr_code").notNull(),
  scanned: boolean("scanned").default(false),
  scannedAt: timestamp("scanned_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  reportedBy: integer("reported_by").notNull().references(() => users.id),
  contentId: text("content_id").notNull(),
  contentType: text("content_type", { enum: ["POST", "COMMENT", "PRODUCT", "USER"] }).notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] }).default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const moderationResponses = pgTable("moderation_responses", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => contentReports.id),
  adminId: integer("admin_id").notNull().references(() => adminUsers.id),
  response: text("response").notNull(),
  action: text("action", { enum: ["WARNING", "REMOVE", "BAN", "NO_ACTION"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorViolations = pgTable("vendor_violations", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => users.id),
  violationType: text("violation_type", { 
    enum: ["POLICY_VIOLATION", "QUALITY_ISSUE", "DELIVERY_ISSUE", "PAYMENT_ISSUE", "CUSTOMER_COMPLAINT"]
  }).notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] }).default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const complianceDocuments = pgTable("compliance_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  documentType: text("document_type", {
    enum: ["ID_CARD", "BUSINESS_LICENSE", "TAX_ID", "VEHICLE_REGISTRATION", "DRIVER_LICENSE", "INSURANCE"]
  }).notNull(),
  documentUrl: text("document_url").notNull(),
  status: text("status", { enum: ["PENDING", "APPROVED", "REJECTED"] }).default("PENDING"),
  reviewedBy: integer("reviewed_by").references(() => adminUsers.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const escrowAccounts = pgTable("escrow_accounts", {
  id: serial("id").primaryKey(),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentDistributions = pgTable("payment_distributions", {
  id: serial("id").primaryKey(),
  paymentId: uuid("payment_id").notNull(),
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status", { enum: ["PENDING", "COMPLETED", "FAILED"] }).default("PENDING"),
  distributedAt: timestamp("distributed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // Unique user ID (e.g., BP-000001)
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  password: text("password").notNull(),
  role: text("role", { enum: ["CONSUMER", "MERCHANT", "DRIVER"] }).notNull(),
  isVerified: boolean("is_verified").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  isIdentityVerified: boolean("is_identity_verified").default(false),
  profilePicture: text("profile_picture"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("Nigeria"),
  bio: text("bio"),
  socialProvider: text("social_provider"), // For social login tracking
  socialId: text("social_id"), // External ID from social provider
  createdAt: timestamp("created_at").defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userLocations = pgTable("user_locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  image: text("image"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  inStock: boolean("in_stock").default(true),
  minimumOrder: integer("minimum_order").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: integer("buyer_id").notNull().references(() => users.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] }).default("pending"),
  deliveryAddress: text("delivery_address").notNull(),
  driverId: integer("driver_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendor Feed Posts
export const vendorPosts = pgTable("vendor_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorId: integer("vendor_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  postType: text("post_type", { enum: ["PRODUCT_UPDATE", "NEW_PRODUCT", "PROMOTION", "ANNOUNCEMENT", "RESTOCK"] }).notNull(),
  productId: uuid("product_id").references(() => products.id), // Optional - for product-related posts
  images: text("images").array(), // Array of image URLs
  tags: text("tags").array(), // Array of tags for discoverability
  originalPrice: decimal("original_price", { precision: 12, scale: 2 }), // For promotions
  discountPrice: decimal("discount_price", { precision: 12, scale: 2 }), // For promotions
  discountPercentage: integer("discount_percentage"), // For promotions
  validUntil: timestamp("valid_until"), // For time-limited offers
  isActive: boolean("is_active").default(true),
  viewCount: integer("view_count").default(0),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vendor Post Likes
export const vendorPostLikes = pgTable("vendor_post_likes", {
  id: serial("id").primaryKey(),
  postId: uuid("post_id").notNull().references(() => vendorPosts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendor Post Comments
export const vendorPostComments = pgTable("vendor_post_comments", {
  id: serial("id").primaryKey(),
  postId: uuid("post_id").notNull().references(() => vendorPosts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  parentCommentId: integer("parent_comment_id"), // For reply threads
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat Conversations
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: integer("customer_id").notNull().references(() => users.id),
  vendorId: integer("vendor_id").notNull().references(() => users.id),
  productId: uuid("product_id").references(() => products.id),
  conversationType: text("conversation_type", { enum: ["QUOTE", "ORDER", "GENERAL"] }).notNull(),
  status: text("status", { enum: ["ACTIVE", "CLOSED"] }).default("ACTIVE"),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: text("message_type", { enum: ["TEXT", "QUOTE_REQUEST", "QUOTE_RESPONSE", "ORDER_UPDATE"] }).default("TEXT"),
  attachedData: json("attached_data"), // For storing quotes, order details, etc.
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// Merchant Analytics
export const merchantAnalytics = pgTable("merchant_analytics", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id").notNull().references(() => users.id),
  date: timestamp("date").defaultNow(),
  dailySales: decimal("daily_sales", { precision: 12, scale: 2 }).default("0"),
  dailyOrders: integer("daily_orders").default(0),
  dailyViews: integer("daily_views").default(0),
  dailyClicks: integer("daily_clicks").default(0),
  topProduct: uuid("top_product").references(() => products.id),
  peakHour: integer("peak_hour"), // Hour of day with most activity
  createdAt: timestamp("created_at").defaultNow(),
});

// Driver Profiles
export const driverProfiles = pgTable("driver_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  driverTier: text("driver_tier", { enum: ["PREMIUM", "STANDARD"] }).notNull().default("STANDARD"),
  accessLevel: text("access_level", { enum: ["RESTRICTED", "OPEN"] }).notNull().default("OPEN"),
  vehicleType: text("vehicle_type", { enum: ["MOTORCYCLE", "CAR", "VAN", "TRUCK"] }).notNull(),
  vehiclePlate: text("vehicle_plate").notNull(),
  vehicleModel: text("vehicle_model"),
  vehicleYear: integer("vehicle_year"),
  driverLicense: text("driver_license").notNull(),
  vehicleDocuments: text("vehicle_documents").array(), // Array of document URLs
  isAvailable: boolean("is_available").default(true),
  currentLocation: json("current_location"), // Store lat/lng
  serviceTypes: text("service_types").array(), // ["FUEL_DELIVERY", "PACKAGE_DELIVERY", "TAXI"]
  totalDeliveries: integer("total_deliveries").default(0),
  totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 }).default("0"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  // Premium/Restricted driver specific fields
  backgroundCheckStatus: text("background_check_status", { enum: ["PENDING", "APPROVED", "REJECTED"] }).default("PENDING"),
  securityClearance: text("security_clearance", { enum: ["NONE", "BASIC", "HIGH", "MAXIMUM"] }).default("NONE"),
  bondInsurance: boolean("bond_insurance").default(false),
  maxCargoValue: decimal("max_cargo_value", { precision: 12, scale: 2 }).default("50000"),
  specializations: text("specializations").array(), // ["JEWELRY", "ELECTRONICS", "DOCUMENTS", "PHARMACEUTICALS"]
  restrictedDeliveryTypes: text("restricted_delivery_types").array(), // Types only premium drivers can handle
  tierSpecificBenefits: json("tier_specific_benefits"), // Benefits based on driver tier
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery Requests
export const deliveryRequests = pgTable("delivery_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: integer("customer_id").notNull().references(() => users.id),
  merchantId: integer("merchant_id").references(() => users.id),
  driverId: integer("driver_id").references(() => users.id),
  orderId: uuid("order_id").references(() => orders.id),
  deliveryType: text("delivery_type", { enum: ["FUEL", "PACKAGE", "FOOD", "GROCERY", "JEWELRY", "ELECTRONICS", "DOCUMENTS", "PHARMACEUTICALS", "HIGH_VALUE", "OTHER"] }).notNull(),
  cargoValue: decimal("cargo_value", { precision: 12, scale: 2 }).default("0"), // Estimated value of cargo
  requiresPremiumDriver: boolean("requires_premium_driver").default(false),
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  pickupLocation: json("pickup_location"), // lat/lng
  deliveryLocation: json("delivery_location"), // lat/lng
  estimatedDistance: decimal("estimated_distance", { precision: 8, scale: 2 }),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { 
    enum: ["PENDING", "ACCEPTED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"] 
  }).default("PENDING"),
  scheduledTime: timestamp("scheduled_time"),
  acceptedAt: timestamp("accepted_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"),
  proofOfDelivery: text("proof_of_delivery"), // Photo URL or QR code
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Merchant Notifications
export const merchantNotifications = pgTable("merchant_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: integer("merchant_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type", { 
    enum: ["ORDER", "PAYMENT", "DELIVERY", "PROMOTION", "SYSTEM", "REVIEW"] 
  }).notNull(),
  relatedId: uuid("related_id"), // Can reference orders, products, etc.
  isRead: boolean("is_read").default(false),
  priority: text("priority", { enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] }).default("MEDIUM"),
  actionUrl: text("action_url"), // Deep link for notification action
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// Social Profiles for OAuth integration
export const socialProfiles = pgTable("social_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["GOOGLE", "APPLE", "FACEBOOK"] }).notNull(),
  providerId: text("provider_id").notNull(), // Social platform's user ID
  email: text("email"),
  displayName: text("display_name"),
  profilePicture: text("profile_picture"),
  accessToken: text("access_token"), // Encrypted in production
  refreshToken: text("refresh_token"), // Encrypted in production
  tokenExpiresAt: timestamp("token_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  providerAccountIdx: index("social_provider_account_idx").on(table.provider, table.providerId),
  userProviderIdx: index("social_user_provider_idx").on(table.userId, table.provider),
}));

// Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketNumber: text("ticket_number").notNull().unique(), // Auto-generated ticket number
  userId: integer("user_id").references(() => users.id), // Nullable for guest tickets
  userRole: text("user_role", { enum: ["CONSUMER", "MERCHANT", "DRIVER", "GUEST"] }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] }).default("OPEN"),
  priority: text("priority", { enum: ["LOW", "NORMAL", "HIGH", "URGENT"] }).default("NORMAL"),
  assignedTo: integer("assigned_to").references(() => users.id), // Admin/support staff
  adminNotes: text("admin_notes"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Identity Verification tables
export const identityVerifications = pgTable("identity_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  verificationStatus: text("verification_status", { enum: ["PENDING", "APPROVED", "REJECTED"] }).default("PENDING"),
  faceImageUrl: text("face_image_url"),
  verificationDate: timestamp("verification_date"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const driverVerifications = pgTable("driver_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  licenseNumber: text("license_number").notNull(),
  licenseExpiryDate: text("license_expiry_date").notNull(),
  licenseImageUrl: text("license_image_url"),
  vehicleType: text("vehicle_type").notNull(),
  vehiclePlate: text("vehicle_plate").notNull(),
  vehicleModel: text("vehicle_model"),
  vehicleYear: text("vehicle_year"),
  verificationStatus: text("verification_status", { enum: ["PENDING", "APPROVED", "REJECTED"] }).default("PENDING"),
  verificationDate: timestamp("verification_date"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const phoneVerifications = pgTable("phone_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  phoneNumber: text("phone_number").notNull(),
  otpCode: text("otp_code").notNull(),
  isVerified: boolean("is_verified").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  locations: many(userLocations),
  products: many(products),
  orders: many(orders),
  cartItems: many(cartItems),
  socialProfiles: many(socialProfiles),
}));

export const userLocationsRelations = relations(userLocations, ({ one }) => ({
  user: one(users, { fields: [userLocations.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  seller: one(users, { fields: [products.sellerId], references: [users.id] }),
  orders: many(orders),
  cartItems: many(cartItems),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  seller: one(users, { fields: [orders.sellerId], references: [users.id] }),
  driver: one(users, { fields: [orders.driverId], references: [users.id] }),
  product: one(products, { fields: [orders.productId], references: [products.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const vendorPostsRelations = relations(vendorPosts, ({ one, many }) => ({
  vendor: one(users, { fields: [vendorPosts.vendorId], references: [users.id] }),
  product: one(products, { fields: [vendorPosts.productId], references: [products.id] }),
  likes: many(vendorPostLikes),
  comments: many(vendorPostComments),
}));

export const vendorPostLikesRelations = relations(vendorPostLikes, ({ one }) => ({
  post: one(vendorPosts, { fields: [vendorPostLikes.postId], references: [vendorPosts.id] }),
  user: one(users, { fields: [vendorPostLikes.userId], references: [users.id] }),
}));

export const vendorPostCommentsRelations = relations(vendorPostComments, ({ one, many }) => ({
  post: one(vendorPosts, { fields: [vendorPostComments.postId], references: [vendorPosts.id] }),
  user: one(users, { fields: [vendorPostComments.userId], references: [users.id] }),
  parentComment: one(vendorPostComments, { fields: [vendorPostComments.parentCommentId], references: [vendorPostComments.id] }),
  replies: many(vendorPostComments),
}));



export const merchantAnalyticsRelations = relations(merchantAnalytics, ({ one }) => ({
  merchant: one(users, { fields: [merchantAnalytics.merchantId], references: [users.id] }),
  topProduct: one(products, { fields: [merchantAnalytics.topProduct], references: [products.id] }),
}));

export const driverProfilesRelations = relations(driverProfiles, ({ one, many }) => ({
  user: one(users, { fields: [driverProfiles.userId], references: [users.id] }),
  deliveryRequests: many(deliveryRequests),
}));

export const deliveryRequestsRelations = relations(deliveryRequests, ({ one }) => ({
  customer: one(users, { fields: [deliveryRequests.customerId], references: [users.id] }),
  merchant: one(users, { fields: [deliveryRequests.merchantId], references: [users.id] }),
  driver: one(users, { fields: [deliveryRequests.driverId], references: [users.id] }),
  order: one(orders, { fields: [deliveryRequests.orderId], references: [orders.id] }),
}));

export const merchantNotificationsRelations = relations(merchantNotifications, ({ one }) => ({
  merchant: one(users, { fields: [merchantNotifications.merchantId], references: [users.id] }),
}));

export const socialProfilesRelations = relations(socialProfiles, ({ one }) => ({
  user: one(users, { fields: [socialProfiles.userId], references: [users.id] }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, { fields: [supportTickets.userId], references: [users.id] }),
  assignedTo: one(users, { fields: [supportTickets.assignedTo], references: [users.id] }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  fullName: true,
  email: true,
  phone: true,
  password: true,
  role: true,
});

export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const otpVerificationSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const insertCategorySchema = createInsertSchema(categories);
export const insertProductSchema = createInsertSchema(products);
export const insertOrderSchema = createInsertSchema(orders);
export const insertCartItemSchema = createInsertSchema(cartItems);
export const insertUserLocationSchema = createInsertSchema(userLocations);
export const insertVendorPostSchema = createInsertSchema(vendorPosts);
export const insertVendorPostLikeSchema = createInsertSchema(vendorPostLikes);
export const insertVendorPostCommentSchema = createInsertSchema(vendorPostComments);

// VendorPost types
export type VendorPost = typeof vendorPosts.$inferSelect;
export type InsertVendorPost = z.infer<typeof insertVendorPostSchema>;

// Enhanced VendorPost type with additional fields from database joins
export interface ExtendedVendorPost extends VendorPost {
  vendorName: string;
  vendorProfilePicture?: string;
  vendorRole: string;
  productName?: string;
  productDescription?: string;
  likesCount: number;
}

export const insertConversationSchema = createInsertSchema(conversations);
export const insertChatMessageSchema = createInsertSchema(chatMessages);


export const insertDriverProfileSchema = createInsertSchema(driverProfiles);
// Tables that are referenced but may not exist yet - commenting out for now
// export const insertDeliveryRequestSchema = createInsertSchema(deliveryRequests);
// export const insertMerchantNotificationSchema = createInsertSchema(merchantNotifications);
export const insertSupportTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(["TECHNICAL", "BILLING", "GENERAL", "FEATURE_REQUEST", "BUG_REPORT"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  userEmail: z.string().email(),
  userRole: z.enum(["CONSUMER", "MERCHANT", "DRIVER", "ADMIN"]),
  attachments: z.array(z.string()).optional()
});



// Fuel Order schema will be defined after the table

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type UserLocation = typeof userLocations.$inferSelect;
export type InsertUserLocation = z.infer<typeof insertUserLocationSchema>;

export type VendorPostLike = typeof vendorPostLikes.$inferSelect;
export type InsertVendorPostLike = z.infer<typeof insertVendorPostLikeSchema>;
export type VendorPostComment = typeof vendorPostComments.$inferSelect;
export type InsertVendorPostComment = z.infer<typeof insertVendorPostCommentSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type MerchantProfile = typeof merchantProfiles.$inferSelect;
export type InsertMerchantProfile = z.infer<typeof insertMerchantProfileSchema>;
export type MerchantAnalytics = typeof merchantAnalytics.$inferSelect;
export type InsertMerchantAnalytics = z.infer<typeof insertMerchantAnalyticsSchema>;
export type DriverProfile = typeof driverProfiles.$inferSelect;
export type InsertDriverProfile = z.infer<typeof insertDriverProfileSchema>;
// export type DeliveryRequest = typeof deliveryRequests.$inferSelect;
// export type InsertDeliveryRequest = z.infer<typeof insertDeliveryRequestSchema>;
// export type MerchantNotification = typeof merchantNotifications.$inferSelect;  
// export type InsertMerchantNotification = z.infer<typeof insertMerchantNotificationSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SocialProfile = typeof socialProfiles.$inferSelect;
export type InsertSocialProfile = typeof socialProfiles.$inferInsert;

// Payment and Transaction Management Tables
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00"),
  currency: text("currency").default("NGN"),
  isActive: boolean("is_active").default(true),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["CARD", "BANK_ACCOUNT", "WALLET", "USSD"] }).notNull(),
  provider: text("provider").notNull(), // paystack, flutterwave, etc
  paystackCustomerId: text("paystack_customer_id"),
  paystackAuthCode: text("paystack_auth_code"),
  cardBin: text("card_bin"),
  cardLast4: text("card_last4"),
  cardType: text("card_type"), // visa, mastercard, verve
  cardBank: text("card_bank"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id),
  recipientId: integer("recipient_id").references(() => users.id),
  walletId: integer("wallet_id").references(() => wallets.id),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id),
  orderId: uuid("order_id").references(() => orders.id),

  // Transaction details
  type: text("type", { 
    enum: ["DEPOSIT", "WITHDRAWAL", "TRANSFER", "PAYMENT", "REFUND", "COMMISSION", "ESCROW_HOLD", "ESCROW_RELEASE"] 
  }).notNull(),
  status: text("status", { 
    enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "CANCELLED", "REVERSED"] 
  }).default("PENDING"),

  // Amount details
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 15, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").default("NGN"),

  // Payment gateway details
  paystackReference: text("paystack_reference").unique(),
  paystackTransactionId: text("paystack_transaction_id"),
  paystackAccessCode: text("paystack_access_code"),
  gatewayResponse: json("gateway_response"),

  // Transaction metadata
  description: text("description"),
  metadata: json("metadata"),
  channel: text("channel"), // card, bank, ussd, qr, etc
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  // Timestamps
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const escrowTransactions = pgTable("escrow_transactions", {
  id: serial("id").primaryKey(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  buyerId: integer("buyer_id").notNull().references(() => users.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  driverId: integer("driver_id").references(() => users.id),

  // Escrow details
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  sellerAmount: decimal("seller_amount", { precision: 15, scale: 2 }).notNull(),
  driverAmount: decimal("driver_amount", { precision: 15, scale: 2 }).default("0.00"),
  platformFee: decimal("platform_fee", { precision: 15, scale: 2 }).default("0.00"),

  status: text("status", { 
    enum: ["HELD", "RELEASED_TO_SELLER", "RELEASED_TO_DRIVER", "REFUNDED", "DISPUTED"] 
  }).default("HELD"),

  // Release conditions
  releaseCondition: text("release_condition", { 
    enum: ["DELIVERY_CONFIRMED", "MANUAL_RELEASE", "AUTO_RELEASE", "DISPUTE_RESOLVED"] 
  }),
  autoReleaseAt: timestamp("auto_release_at"),
  releasedAt: timestamp("released_at"),

  // Dispute handling
  disputeReason: text("dispute_reason"),
  disputeResolvedBy: integer("dispute_resolved_by").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentNotifications = pgTable("payment_notifications", {
  id: serial("id").primaryKey(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id),
  userId: integer("user_id").notNull().references(() => users.id),

  // Notification details
  type: text("type", { 
    enum: ["PAYMENT_SUCCESS", "PAYMENT_FAILED", "REFUND_PROCESSED", "ESCROW_RELEASED", "LOW_BALANCE"] 
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),

  // Delivery status
  isRead: boolean("is_read").default(false),
  isDelivered: boolean("is_delivered").default(false),
  deliveredAt: timestamp("delivered_at"),

  // Notification channels
  sentViaEmail: boolean("sent_via_email").default(false),
  sentViaSms: boolean("sent_via_sms").default(false),
  sentViaPush: boolean("sent_via_push").default(false),

  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Fraud Detection Tables
export const fraudAlerts = pgTable("fraud_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type", {
    enum: ["SUSPICIOUS_LOGIN", "UNUSUAL_TRANSACTION", "VELOCITY_CHECK", "DEVICE_MISMATCH", "LOCATION_ANOMALY", "PATTERN_MATCHING"]
  }).notNull(),
  severity: text("severity", { enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }).notNull(),
  status: text("status", { enum: ["ACTIVE", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"] }).default("ACTIVE"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  riskScore: integer("risk_score").notNull(), // 0-100
  metadata: json("metadata"), // Store detection details
  detectedAt: timestamp("detected_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const suspiciousActivities = pgTable("suspicious_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  activityType: text("activity_type").notNull(),
  description: text("description").notNull(),
  riskIndicators: json("risk_indicators").$type<string[]>().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  location: json("location"), // GPS or IP-based location
  metadata: json("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accountFlags = pgTable("account_flags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  flagType: text("flag_type", {
    enum: ["FRAUD_RISK", "SUSPICIOUS_ACTIVITY", "MANUAL_REVIEW", "COMPLIANCE_ISSUE", "SECURITY_BREACH"]
  }).notNull(),
  severity: text("severity", { enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }).notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["ACTIVE", "RESOLVED", "EXPIRED"] }).default("ACTIVE"),
  flaggedBy: integer("flagged_by").notNull().references(() => adminUsers.id),
  resolvedBy: integer("resolved_by").references(() => adminUsers.id),
  restrictions: json("restrictions"), // Account restrictions imposed
  expiresAt: timestamp("expires_at"),
  flaggedAt: timestamp("flagged_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for payment tables
export const insertWalletSchema = createInsertSchema(wallets);
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods);
export const insertTransactionSchema = createInsertSchema(transactions);
export const insertEscrowTransactionSchema = createInsertSchema(escrowTransactions);
export const insertPaymentNotificationSchema = createInsertSchema(paymentNotifications);
export const insertAdminPaymentActionSchema = createInsertSchema(adminPaymentActions);
export const insertFraudAlertSchema = createInsertSchema(fraudAlerts);
export const insertSuspiciousActivitySchema = createInsertSchema(suspiciousActivities);
export const insertAccountFlagSchema = createInsertSchema(accountFlags);

// Types
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = typeof paymentMethods.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type EscrowTransaction = typeof escrowTransactions.$inferSelect;
export type InsertEscrowTransaction = typeof escrowTransactions.$inferInsert;
export type PaymentNotification = typeof paymentNotifications.$inferSelect;
export type InsertPaymentNotification = typeof paymentNotifications.$inferInsert;
export type AdminPaymentAction = typeof adminPaymentActions.$inferSelect;
export type InsertAdminPaymentAction = typeof adminPaymentActions.$inferInsert;
export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = typeof fraudAlerts.$inferInsert;
export type SuspiciousActivity = typeof suspiciousActivities.$inferSelect;
export type InsertSuspiciousActivity = typeof suspiciousActivities.$inferInsert;
export type AccountFlag = typeof accountFlags.$inferSelect;
export type InsertAccountFlag = typeof accountFlags.$inferInsert;

// Fuel Orders table
export const fuelOrders = pgTable("fuel_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: integer("customer_id").notNull().references(() => users.id),
  driverId: integer("driver_id").references(() => users.id),
  stationId: text("station_id").notNull(),
  fuelType: text("fuel_type", { enum: ["PMS", "AGO", "DPK"] }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLatitude: decimal("delivery_latitude", { precision: 10, scale: 8 }).notNull(),
  deliveryLongitude: decimal("delivery_longitude", { precision: 11, scale: 8 }).notNull(),
  status: text("status", { 
    enum: ["PENDING", "ACCEPTED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"] 
  }).default("PENDING"),
  scheduledDeliveryTime: timestamp("scheduled_delivery_time"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  acceptedAt: timestamp("accepted_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fuel Orders relations
export const fuelOrdersRelations = relations(fuelOrders, ({ one }) => ({
  customer: one(users, { fields: [fuelOrders.customerId], references: [users.id] }),
  driver: one(users, { fields: [fuelOrders.driverId], references: [users.id] }),
}));

export const insertFuelOrderSchema = createInsertSchema(fuelOrders);
export type FuelOrder = typeof fuelOrders.$inferSelect;
export type InsertFuelOrder = typeof fuelOrders.$inferInsert;
// Reviews and Ratings tables
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  reviewerId: integer("reviewer_id").notNull().references(() => users.id),
  revieweeId: integer("reviewee_id").notNull().references(() => users.id),
  revieweeType: text("reviewee_type", { enum: ["MERCHANT", "DRIVER"] }).notNull(),
  orderId: uuid("order_id").references(() => fuelOrders.id),
  rating: integer("rating").notNull().default(1), // 1-5 stars
  comment: text("comment"),
  isVerified: boolean("is_verified").default(false),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const merchantProfiles = pgTable("merchant_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  businessName: text("business_name").notNull(),
  businessType: text("business_type", { 
    enum: ["APPAREL", "ART_ENTERTAINMENT", "BEAUTY_COSMETICS", "EDUCATION", "EVENT_PLANNING", 
           "FINANCE", "SUPERMARKET", "HOTEL", "MEDICAL_HEALTH", "NON_PROFIT", "OIL_GAS", 
           "RESTAURANT", "SHOPPING_RETAIL", "TICKET", "TOLL_GATE", "VEHICLE_SERVICE", "OTHER"] 
  }).notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  phone: text("phone"),
  email: text("email"),
  description: text("description"),
  profilePicture: text("profile_picture"),
  coverPhoto: text("cover_photo"),
  businessHours: jsonb("business_hours").$type<{
    [key: string]: { open: string; close: string; isOpen: boolean }
  }>(),
  deliveryRadius: decimal("delivery_radius", { precision: 10, scale: 2 }).default("5"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("total_reviews").default(0),
  totalOrders: integer("total_orders").default(0),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const locationRecommendations = pgTable("location_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  merchantId: integer("merchant_id").notNull().references(() => users.id),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  distance: decimal("distance", { precision: 10, scale: 3 }), // in kilometers
  relevanceScore: decimal("relevance_score", { precision: 5, scale: 3 }),
  lastRecommended: timestamp("last_recommended").defaultNow(),
  clickCount: integer("click_count").default(0),
  conversionCount: integer("conversion_count").default(0),
});

// Merchant profile schemas and relations
export const insertMerchantProfileSchema = createInsertSchema(merchantProfiles);
export const merchantProfilesRelations = relations(merchantProfiles, ({ one, many }) => ({
  user: one(users, { fields: [merchantProfiles.userId], references: [users.id] }),
  analytics: many(merchantAnalytics),
}));

export const insertMerchantAnalyticsSchema = createInsertSchema(merchantAnalytics);

// Role Management and Multi-Role Support Tables
export const roleApplications = pgTable("role_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  fromRole: text("from_role", { enum: ["CONSUMER", "MERCHANT", "DRIVER"] }).notNull(),
  toRole: text("to_role", { enum: ["CONSUMER", "MERCHANT", "DRIVER"] }).notNull(),
  applicationStatus: text("application_status", { 
    enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "REQUIRES_ADDITIONAL_INFO"] 
  }).default("PENDING"),
  applicationData: json("application_data"), // Store application-specific data
  documents: text("documents").array(), // Array of document URLs
  reviewedBy: integer("reviewed_by").references(() => adminUsers.id),
  reviewNotes: text("review_notes"),
  rejectionReason: text("rejection_reason"),
  appliedAt: timestamp("applied_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role", { enum: ["CONSUMER", "MERCHANT", "DRIVER"] }).notNull(),
  isActive: boolean("is_active").default(true),
  isPrimary: boolean("is_primary").default(false),
  permissionLevel: text("permission_level", { enum: ["BASIC", "INTERMEDIATE", "ADVANCED", "FULL"] }).default("BASIC"),
  roleSpecificData: json("role_specific_data"), // Store role-specific configuration
  activatedAt: timestamp("activated_at").defaultNow(),
  deactivatedAt: timestamp("deactivated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Live System Interactions Tables
export const websocketConnections = pgTable("websocket_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  socketId: text("socket_id").notNull().unique(),
  userRole: text("user_role", { enum: ["CONSUMER", "MERCHANT", "DRIVER", "ADMIN"] }).notNull(),
  connectionType: text("connection_type", { 
    enum: ["ORDER_TRACKING", "LIVE_CHAT", "NOTIFICATIONS", "LOCATION_UPDATES", "ADMIN_MONITORING"] 
  }).notNull(),
  isOnline: boolean("is_online").default(true),
  lastActivity: timestamp("last_activity").defaultNow(),
  metadata: json("metadata"), // Store connection-specific data
  connectedAt: timestamp("connected_at").defaultNow(),
  disconnectedAt: timestamp("disconnected_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const liveNotifications = pgTable("live_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  notificationType: text("notification_type", { 
    enum: ["ORDER_UPDATE", "CHAT_MESSAGE", "PAYMENT_UPDATE", "LOCATION_UPDATE", "PROMOTION", "SYSTEM_ALERT", "EMERGENCY"] 
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority", { enum: ["LOW", "MEDIUM", "HIGH", "URGENT", "EMERGENCY"] }).default("MEDIUM"),
  category: text("category", { enum: ["TRANSACTIONAL", "PROMOTIONAL", "INFORMATIONAL", "SECURITY"] }).notNull(),
  
  // Delivery channels
  channels: text("channels").array().notNull(), // ["PUSH", "EMAIL", "SMS", "WEBSOCKET", "IN_APP"]
  
  // Status tracking
  isRead: boolean("is_read").default(false),
  isDelivered: boolean("is_delivered").default(false),
  deliveryAttempts: integer("delivery_attempts").default(0),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  
  // Content and metadata
  actionUrl: text("action_url"),
  imageUrl: text("image_url"),
  metadata: json("metadata"),
  expiresAt: timestamp("expires_at"),
  
  // Related entities
  relatedEntityType: text("related_entity_type"), // order, chat, payment, etc.
  relatedEntityId: text("related_entity_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const locationTracking = pgTable("location_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  userRole: text("user_role", { enum: ["CONSUMER", "MERCHANT", "DRIVER"] }).notNull(),
  
  // Location data
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  altitude: decimal("altitude", { precision: 8, scale: 2 }),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }),
  heading: decimal("heading", { precision: 6, scale: 2 }),
  speed: decimal("speed", { precision: 8, scale: 2 }),
  
  // Context
  trackingType: text("tracking_type", { 
    enum: ["DRIVER_DELIVERY", "CUSTOMER_PICKUP", "MERCHANT_LOCATION", "EMERGENCY", "GENERAL"] 
  }).notNull(),
  relatedOrderId: uuid("related_order_id").references(() => orders.id),
  relatedDeliveryId: uuid("related_delivery_id").references(() => deliveryRequests.id),
  
  // Status
  isActive: boolean("is_active").default(true),
  batteryLevel: integer("battery_level"),
  networkType: text("network_type"),
  
  // Privacy and permissions
  sharingLevel: text("sharing_level", { 
    enum: ["PUBLIC", "CUSTOMERS_ONLY", "MERCHANTS_ONLY", "PRIVATE"] 
  }).default("CUSTOMERS_ONLY"),
  
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Live Chat System Enhancement
export const chatRooms = pgTable("chat_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomType: text("room_type", { 
    enum: ["CUSTOMER_MERCHANT", "CUSTOMER_DRIVER", "CUSTOMER_SUPPORT", "GROUP", "EMERGENCY"] 
  }).notNull(),
  roomName: text("room_name"),
  participants: json("participants").$type<number[]>().notNull(), // Array of user IDs
  
  // Room settings
  isActive: boolean("is_active").default(true),
  isEncrypted: boolean("is_encrypted").default(true),
  maxParticipants: integer("max_participants").default(10),
  
  // Moderation
  moderators: json("moderators").$type<number[]>(), // Array of moderator user IDs
  chatRules: json("chat_rules"),
  
  // Related entities
  relatedOrderId: uuid("related_order_id").references(() => orders.id),
  relatedTicketId: uuid("related_ticket_id").references(() => supportTickets.id),
  
  // Metadata
  metadata: json("metadata"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const enhancedChatMessages: any = pgTable("enhanced_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatRoomId: uuid("chat_room_id").notNull().references(() => chatRooms.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  
  // Message content
  messageType: text("message_type", { 
    enum: ["TEXT", "IMAGE", "VIDEO", "AUDIO", "LOCATION", "DOCUMENT", "QUICK_RESPONSE", "SYSTEM"] 
  }).default("TEXT"),
  content: text("content"),
  attachments: json("attachments").$type<{url: string, type: string, size?: number}[]>(),
  
  // Message status
  isEdited: boolean("is_edited").default(false),
  isDeleted: boolean("is_deleted").default(false),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
  
  // Read receipts
  readBy: json("read_by").$type<{userId: number, readAt: string}[]>().default([]),
  deliveredTo: json("delivered_to").$type<{userId: number, deliveredAt: string}[]>().default([]),
  
  // Reply and threading
  replyToMessageId: uuid("reply_to_message_id").references((): any => enhancedChatMessages.id),
  threadId: uuid("thread_id"),
  
  // Priority and urgency
  priority: text("priority", { enum: ["LOW", "NORMAL", "HIGH", "URGENT"] }).default("NORMAL"),
  isEmergency: boolean("is_emergency").default(false),
  
  // Metadata
  metadata: json("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data Analytics and Personalization Tables
export const userBehaviorTracking = pgTable("user_behavior_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  
  // Session information
  sessionId: text("session_id").notNull(),
  userRole: text("user_role", { enum: ["CONSUMER", "MERCHANT", "DRIVER"] }).notNull(),
  
  // Behavior data
  eventType: text("event_type", { 
    enum: ["PAGE_VIEW", "CLICK", "SEARCH", "PURCHASE", "SCROLL", "TIME_SPENT", "INTERACTION", "CONVERSION"] 
  }).notNull(),
  eventCategory: text("event_category").notNull(),
  eventAction: text("event_action").notNull(),
  eventLabel: text("event_label"),
  eventValue: decimal("event_value", { precision: 12, scale: 2 }),
  
  // Page/screen information
  pagePath: text("page_path"),
  pageTitle: text("page_title"),
  referrer: text("referrer"),
  
  // Device and technical data
  deviceType: text("device_type", { enum: ["MOBILE", "TABLET", "DESKTOP"] }),
  browserName: text("browser_name"),
  operatingSystem: text("operating_system"),
  screenResolution: text("screen_resolution"),
  
  // Location and network
  ipAddress: text("ip_address"),
  country: text("country"),
  city: text("city"),
  networkType: text("network_type"),
  
  // Timing
  duration: integer("duration"), // in milliseconds
  timestamp: timestamp("timestamp").defaultNow(),
  
  // Custom data
  customDimensions: json("custom_dimensions"),
  metadata: json("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const personalizationProfiles = pgTable("personalization_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  
  // Preferences
  preferredCategories: text("preferred_categories").array().default([]),
  preferredMerchants: json("preferred_merchants").$type<number[]>().default([]),
  preferredDrivers: json("preferred_drivers").$type<number[]>().default([]),
  priceRange: json("price_range").$type<{min: number, max: number}>(),
  
  // Behavioral patterns
  averageOrderValue: decimal("average_order_value", { precision: 12, scale: 2 }).default("0"),
  orderFrequency: text("order_frequency", { enum: ["DAILY", "WEEKLY", "MONTHLY", "OCCASIONAL"] }),
  peakActivityHours: json("peak_activity_hours").$type<number[]>().default([]),
  preferredDeliveryTimes: json("preferred_delivery_times").$type<string[]>().default([]),
  
  // Location preferences
  frequentLocations: json("frequent_locations").$type<{name: string, lat: number, lng: number, frequency: number}[]>().default([]),
  deliveryRadius: integer("delivery_radius").default(10), // km
  
  // Communication preferences
  notificationPreferences: json("notification_preferences").$type<{
    email: boolean,
    sms: boolean,
    push: boolean,
    marketing: boolean,
    promotions: boolean
  }>().default({
    email: true,
    sms: true,
    push: true,
    marketing: false,
    promotions: false
  }),
  
  // AI/ML data
  recommendationScore: json("recommendation_score").$type<{[key: string]: number}>().default({}),
  churnRisk: decimal("churn_risk", { precision: 5, scale: 4 }).default("0.0000"), // 0-1 scale
  lifetimeValue: decimal("lifetime_value", { precision: 15, scale: 2 }).default("0.00"),
  
  // Segmentation
  customerSegment: text("customer_segment", { 
    enum: ["HIGH_VALUE", "REGULAR", "OCCASIONAL", "NEW", "AT_RISK", "CHURNED"] 
  }).default("NEW"),
  
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemMetrics = pgTable("system_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Metric identification
  metricType: text("metric_type", { 
    enum: ["PERFORMANCE", "USAGE", "BUSINESS", "TECHNICAL", "SECURITY", "USER_EXPERIENCE"] 
  }).notNull(),
  metricName: text("metric_name").notNull(),
  metricCategory: text("metric_category").notNull(),
  
  // Metric values
  value: decimal("value", { precision: 20, scale: 8 }).notNull(),
  unit: text("unit"), // e.g., "ms", "count", "percentage", "bytes"
  
  // Dimensions
  dimensions: json("dimensions").$type<{[key: string]: string}>().default({}),
  tags: text("tags").array().default([]),
  
  // Aggregation info
  aggregationType: text("aggregation_type", { 
    enum: ["SUM", "AVERAGE", "COUNT", "MIN", "MAX", "MEDIAN", "PERCENTILE"] 
  }).default("COUNT"),
  timeWindow: text("time_window"), // e.g., "1m", "5m", "1h", "1d"
  
  // Metadata
  source: text("source"), // Which service/component generated this metric
  environment: text("environment").default("production"),
  version: text("version"),
  
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ecosystem Interaction Tracking
export const crossRoleInteractions = pgTable("cross_role_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Parties involved
  initiatorId: integer("initiator_id").notNull().references(() => users.id),
  initiatorRole: text("initiator_role", { enum: ["CONSUMER", "MERCHANT", "DRIVER"] }).notNull(),
  targetId: integer("target_id").notNull().references(() => users.id),
  targetRole: text("target_role", { enum: ["CONSUMER", "MERCHANT", "DRIVER"] }).notNull(),
  
  // Interaction details
  interactionType: text("interaction_type", { 
    enum: ["ORDER_PLACEMENT", "DELIVERY_REQUEST", "CHAT_INITIATION", "REVIEW_SUBMISSION", "RECOMMENDATION", "DISPUTE"] 
  }).notNull(),
  interactionStatus: text("interaction_status", { 
    enum: ["INITIATED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "FAILED"] 
  }).default("INITIATED"),
  
  // Context
  relatedOrderId: uuid("related_order_id").references(() => orders.id),
  relatedChatId: uuid("related_chat_id").references(() => chatRooms.id),
  outcome: text("outcome"), // Success, failure, satisfaction level, etc.
  
  // Metrics
  duration: integer("duration"), // Duration in seconds
  satisfactionRating: integer("satisfaction_rating"), // 1-5 scale
  
  // Workflow tracking
  workflowStage: text("workflow_stage"),
  nextAction: text("next_action"),
  
  metadata: json("metadata"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for new tables
export const roleApplicationsRelations = relations(roleApplications, ({ one }) => ({
  user: one(users, { fields: [roleApplications.userId], references: [users.id] }),
  reviewer: one(adminUsers, { fields: [roleApplications.reviewedBy], references: [adminUsers.id] }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
}));

export const websocketConnectionsRelations = relations(websocketConnections, ({ one }) => ({
  user: one(users, { fields: [websocketConnections.userId], references: [users.id] }),
}));

export const liveNotificationsRelations = relations(liveNotifications, ({ one }) => ({
  user: one(users, { fields: [liveNotifications.userId], references: [users.id] }),
}));

export const locationTrackingRelations = relations(locationTracking, ({ one }) => ({
  user: one(users, { fields: [locationTracking.userId], references: [users.id] }),
  order: one(orders, { fields: [locationTracking.relatedOrderId], references: [orders.id] }),
  delivery: one(deliveryRequests, { fields: [locationTracking.relatedDeliveryId], references: [deliveryRequests.id] }),
}));

export const chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
  order: one(orders, { fields: [chatRooms.relatedOrderId], references: [orders.id] }),
  ticket: one(supportTickets, { fields: [chatRooms.relatedTicketId], references: [supportTickets.id] }),
  messages: many(enhancedChatMessages),
}));

export const enhancedChatMessagesRelations = relations(enhancedChatMessages, ({ one }) => ({
  chatRoom: one(chatRooms, { fields: [enhancedChatMessages.chatRoomId], references: [chatRooms.id] }),
  sender: one(users, { fields: [enhancedChatMessages.senderId], references: [users.id] }),
}));

export const userBehaviorTrackingRelations = relations(userBehaviorTracking, ({ one }) => ({
  user: one(users, { fields: [userBehaviorTracking.userId], references: [users.id] }),
}));

export const personalizationProfilesRelations = relations(personalizationProfiles, ({ one }) => ({
  user: one(users, { fields: [personalizationProfiles.userId], references: [users.id] }),
}));

export const crossRoleInteractionsRelations = relations(crossRoleInteractions, ({ one }) => ({
  initiator: one(users, { fields: [crossRoleInteractions.initiatorId], references: [users.id] }),
  target: one(users, { fields: [crossRoleInteractions.targetId], references: [users.id] }),
  relatedOrder: one(orders, { fields: [crossRoleInteractions.relatedOrderId], references: [orders.id] }),
  relatedChat: one(chatRooms, { fields: [crossRoleInteractions.relatedChatId], references: [chatRooms.id] }),
}));

// Insert schemas for new tables
export const insertRoleApplicationSchema = createInsertSchema(roleApplications);
export const insertUserRoleSchema = createInsertSchema(userRoles);
export const insertWebsocketConnectionSchema = createInsertSchema(websocketConnections);
export const insertLiveNotificationSchema = createInsertSchema(liveNotifications);
export const insertLocationTrackingSchema = createInsertSchema(locationTracking);
export const insertChatRoomSchema = createInsertSchema(chatRooms);
export const insertEnhancedChatMessageSchema = createInsertSchema(enhancedChatMessages);
export const insertUserBehaviorTrackingSchema = createInsertSchema(userBehaviorTracking);
export const insertPersonalizationProfileSchema = createInsertSchema(personalizationProfiles);
export const insertSystemMetricSchema = createInsertSchema(systemMetrics);
export const insertCrossRoleInteractionSchema = createInsertSchema(crossRoleInteractions);

// Types for new tables
export type RoleApplication = typeof roleApplications.$inferSelect;
export type InsertRoleApplication = typeof roleApplications.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;
export type WebsocketConnection = typeof websocketConnections.$inferSelect;
export type InsertWebsocketConnection = typeof websocketConnections.$inferInsert;
export type LiveNotification = typeof liveNotifications.$inferSelect;
export type InsertLiveNotification = typeof liveNotifications.$inferInsert;
export type LocationTracking = typeof locationTracking.$inferSelect;
export type InsertLocationTracking = typeof locationTracking.$inferInsert;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = typeof chatRooms.$inferInsert;
export type EnhancedChatMessage = typeof enhancedChatMessages.$inferSelect;
export type InsertEnhancedChatMessage = typeof enhancedChatMessages.$inferInsert;
export type UserBehaviorTracking = typeof userBehaviorTracking.$inferSelect;
export type InsertUserBehaviorTracking = typeof userBehaviorTracking.$inferInsert;
export type PersonalizationProfile = typeof personalizationProfiles.$inferSelect;
export type InsertPersonalizationProfile = typeof personalizationProfiles.$inferInsert;
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = typeof systemMetrics.$inferInsert;
export type CrossRoleInteraction = typeof crossRoleInteractions.$inferSelect;
export type InsertCrossRoleInteraction = typeof crossRoleInteractions.$inferInsert;
