import { 
  users, otpCodes, categories, products, cartItems, userLocations, orders,
  vendorPosts, vendorPostLikes, vendorPostComments, conversations, chatMessages,
  driverProfiles, merchantProfiles, deliveryRequests, merchantAnalytics, supportTickets,
  identityVerifications, driverVerifications, phoneVerifications, wallets, paymentMethods,
  transactions, deliveryConfirmations,
  type User, type InsertUser, type OtpCode, type InsertOtpCode,
  type Category, type InsertCategory, type Product, type InsertProduct,
  type CartItem, type InsertCartItem, type UserLocation, type InsertUserLocation,
  type Order, type InsertOrder, type VendorPost, type InsertVendorPost,
  type VendorPostLike, type InsertVendorPostLike, type VendorPostComment, type InsertVendorPostComment,
  type Conversation, type InsertConversation, type ChatMessage, type InsertChatMessage,
  type DriverProfile, type InsertDriverProfile, type MerchantProfile, type InsertMerchantProfile,
  type DeliveryRequest, type InsertDeliveryRequest, type MerchantAnalytics, type InsertMerchantAnalytics,
  type SupportTicket, type InsertSupportTicket
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, like, desc, sql, or, ne } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySocialId(socialProvider: string, socialId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createSocialUser(userData: { fullName: string; email: string; socialProvider: string; socialId: string; profilePicture?: string; role?: string }): Promise<User>;
  verifyUser(email: string): Promise<void>;
  generateUserId(): Promise<string>;
  linkSocialAccount(userId: number, provider: string, socialId: string, profilePicture?: string): Promise<void>;
  updateUserProfilePicture(userId: number, profilePicture: string): Promise<void>;

  // OTP operations
  createOtpCode(otpCode: InsertOtpCode): Promise<OtpCode>;
  getOtpCode(email: string, code: string): Promise<OtpCode | undefined>;
  markOtpAsUsed(id: number): Promise<void>;

  // Location operations
  upsertUserLocation(location: InsertUserLocation): Promise<UserLocation>;
  getNearbyUsers(lat: number, lng: number, radiusMeters: number, excludeRole?: string): Promise<UserLocation[]>;

  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Product operations
  getProducts(filters: { categoryId?: number; search?: string; limit?: number; offset?: number }): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Cart operations
  getCartItems(userId: number): Promise<CartItem[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(cartItemId: number, quantity: number): Promise<CartItem>;
  removeFromCart(cartItemId: number): Promise<void>;

  // Driver operations
  getDriverProfile(userId: number): Promise<DriverProfile | undefined>;
  createDriverProfile(profile: InsertDriverProfile): Promise<DriverProfile>;
  updateDriverLocation(userId: number, location: { latitude: string; longitude: string; accuracy?: number }): Promise<void>;
  getAvailableDeliveryJobs(): Promise<DeliveryRequest[]>;
  acceptDeliveryJob(jobId: string, driverId: number): Promise<void>;
  getDriverEarnings(userId: number): Promise<{ todayEarnings: number; weeklyEarnings: number; totalEarnings: number; completedDeliveries: number }>;
  getDriverDeliveryHistory(userId: number): Promise<DeliveryRequest[]>;
  getDriverOrders(driverId: number, status?: string): Promise<any[]>;

  // Merchant operations
  getMerchantProfile(userId: number): Promise<MerchantProfile | undefined>;
  createMerchantProfile(profile: InsertMerchantProfile): Promise<MerchantProfile>;
  getMerchantDashboardStats(userId: number): Promise<{ todayRevenue: number; ordersCount: number; productViews: number; unreadMessages: number }>;
  getMerchantOrders(userId: number): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: string, merchantId: number): Promise<void>;
  getMerchantAnalytics(userId: number, period: string): Promise<MerchantAnalytics[]>;
  createDeliveryRequest(request: InsertDeliveryRequest): Promise<DeliveryRequest>;

  // Vendor Feed operations
  getVendorPosts(filters: { limit?: number; offset?: number; vendorId?: number; postType?: string }): Promise<VendorPost[]>;
  createVendorPost(post: InsertVendorPost): Promise<VendorPost>;
  likeVendorPost(postId: string, userId: number): Promise<VendorPostLike>;
  unlikeVendorPost(postId: string, userId: number): Promise<void>;
  getVendorPostLikes(postId: string): Promise<VendorPostLike[]>;
  commentOnVendorPost(comment: InsertVendorPostComment): Promise<VendorPostComment>;
  getVendorPostComments(postId: string): Promise<VendorPostComment[]>;

  // Chat operations
  getConversations(userId: number, role?: string): Promise<any[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getMessages(conversationId: string): Promise<any[]>;
  sendMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getConversationMessages(conversationId: string, limit: number, offset: number): Promise<any[]>;

  // Support Ticket operations
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTickets(filters?: { status?: string; priority?: string; userRole?: string }): Promise<SupportTicket[]>;
  getSupportTicket(ticketId: string): Promise<SupportTicket | undefined>;
  updateSupportTicket(ticketId: string, updateData: Partial<SupportTicket>): Promise<SupportTicket>;

  // Identity verification
  createIdentityVerification(data: any): Promise<any>;
  getIdentityVerificationByUserId(userId: number): Promise<any | null>;
  createDriverVerification(data: any): Promise<any>;
  getDriverVerificationByUserId(userId: number): Promise<any | null>;
  createPhoneVerification(data: any): Promise<any>;
  verifyPhoneOTP(userId: number, otpCode: string): Promise<any | null>;
  updateUser(userId: number, data: any): Promise<any>;

  // Fuel order operations
  getNearbyFuelStations(latitude: number, longitude: number, radius: number): Promise<any>;
  createFuelOrder(data: any): Promise<any>;
  getFuelOrders(userId: number): Promise<any>;
  updateFuelOrderStatus(orderId: string, status: string, driverId?: number): Promise<any>;
  getAvailableFuelOrders(): Promise<any>;

  // Push notifications
  storePushSubscription(userId: number, subscription: any): Promise<any>;
  removePushSubscription(userId: number): Promise<any>;

  // Merchant Discovery methods
  searchMerchants(params: { latitude?: number; longitude?: number; radius?: number; category?: string; searchTerm?: string }): Promise<any[]>;
  getMerchantProducts(merchantId: number): Promise<Product[]>;

  // Fuel Station Discovery methods
  getFuelStations(params: { latitude?: number; longitude?: number; radius?: number; fuelType?: string }): Promise<any[]>;

  // Payment and Wallet operations
  getUserWallet(userId: number): Promise<any>;
  createWallet(userId: number): Promise<any>;
  getUserPaymentMethods(userId: number): Promise<any[]>;
  getUserTransactions(userId: number, limit: number, offset: number): Promise<any[]>;
  addToWishlist(userId: number, productId: string): Promise<any>;
  getWishlistItems(userId: number): Promise<any[]>;
  
  // QR Code operations
  generateDeliveryQR(orderId: string): Promise<any>;
  verifyDeliveryQR(qrCode: string): Promise<any>;
  
  // Real-time order tracking
  updateOrderTracking(orderId: string, status: string, location?: any): Promise<any>;
  getOrderTracking(orderId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserBySocialId(socialProvider: string, socialId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(and(eq(users.socialProvider, socialProvider), eq(users.socialId, socialId)));
    return user || undefined;
  }

  async generateUserId(): Promise<string> {
    const [latestUser] = await db.select().from(users)
      .orderBy(desc(users.id))
      .limit(1);

    const nextNumber = latestUser ? latestUser.id + 1 : 1;
    return `BP-${nextNumber.toString().padStart(6, '0')}`;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userId = await this.generateUserId();
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, userId })
      .returning();
    return user;
  }

  async createSocialUser(userData: { 
    fullName: string; 
    email: string; 
    socialProvider: string; 
    socialId: string; 
    profilePicture?: string;
    role?: string;
  }): Promise<User> {
    const userId = await this.generateUserId();
    const [user] = await db
      .insert(users)
      .values({
        userId,
        fullName: userData.fullName,
        email: userData.email,
        phone: '', // Will be updated later
        password: '', // Social login users don't need passwords
        role: (userData.role as "CONSUMER" | "MERCHANT" | "DRIVER") || 'CONSUMER',
        isVerified: true, // Social login users are pre-verified
        socialProvider: userData.socialProvider,
        socialId: userData.socialId,
        profilePicture: userData.profilePicture,
      })
      .returning();
    return user;
  }

  async verifyUser(email: string): Promise<void> {
    await db
      .update(users)
      .set({ isVerified: true })
      .where(eq(users.email, email));
  }

  async linkSocialAccount(userId: number, provider: string, socialId: string, profilePicture?: string): Promise<void> {
    const updateData: any = {
      socialProvider: provider,
      socialId,
    };
    if (profilePicture) {
      updateData.profilePicture = profilePicture;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }

  async updateUserProfilePicture(userId: number, profilePicture: string): Promise<void> {
    await db
      .update(users)
      .set({ profilePicture })
      .where(eq(users.id, userId));
  }

  // OTP operations
  async createOtpCode(insertOtpCode: InsertOtpCode): Promise<OtpCode> {
    const [otpCode] = await db
      .insert(otpCodes)
      .values(insertOtpCode)
      .returning();
    return otpCode;
  }

  async getOtpCode(email: string, code: string): Promise<OtpCode | undefined> {
    const [otpCode] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.code, code),
          eq(otpCodes.isUsed, false),
          gte(otpCodes.expiresAt, new Date())
        )
      );
    return otpCode || undefined;
  }

  async markOtpAsUsed(id: number): Promise<void> {
    await db
      .update(otpCodes)
      .set({ isUsed: true })
      .where(eq(otpCodes.id, id));
  }

  // Location operations
  async upsertUserLocation(location: InsertUserLocation): Promise<UserLocation> {
    // First try to update existing location
    const existingLocation = await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.userId, location.userId));

    if (existingLocation.length > 0) {
      const [updatedLocation] = await db
        .update(userLocations)
        .set({
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          isActive: location.isActive ?? true,
        })
        .where(eq(userLocations.userId, location.userId))
        .returning();
      return updatedLocation;
    } else {
      const [newLocation] = await db
        .insert(userLocations)
        .values(location)
        .returning();
      return newLocation;
    }
  }

  async getNearbyUsers(lat: number, lng: number, radiusMeters: number, excludeRole?: string): Promise<UserLocation[]> {
    // Simple distance calculation - in production you'd use PostGIS
    const nearbyUsers = await db
      .select()
      .from(userLocations)
      .innerJoin(users, eq(userLocations.userId, users.id))
      .where(
        and(
          eq(userLocations.isActive, true),
          excludeRole ? ne(users.role, excludeRole as any) : sql`true`
        )
      );

    return nearbyUsers.map(result => result.user_locations);
  }

  // Driver operations
  async getDriverProfile(userId: number): Promise<DriverProfile | undefined> {
    const [profile] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, userId));
    return profile || undefined;
  }

  async createDriverProfile(profile: InsertDriverProfile): Promise<DriverProfile> {
    const [driverProfile] = await db
      .insert(driverProfiles)
      .values(profile)
      .returning();
    return driverProfile;
  }

  async updateDriverLocation(userId: number, location: { latitude: string; longitude: string; accuracy?: number }): Promise<void> {
    await db
      .update(driverProfiles)
      .set({
        currentLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: Date.now()
        }
      })
      .where(eq(driverProfiles.userId, userId));
  }

  async getAvailableDeliveryJobs(): Promise<DeliveryRequest[]> {
    const deliveryJobs = await db
      .select()
      .from(deliveryRequests)
      .where(eq(deliveryRequests.status, 'PENDING'))
      .orderBy(desc(deliveryRequests.createdAt));

    return deliveryJobs;
  }

  async acceptDeliveryJob(jobId: string, driverId: number): Promise<void> {
    await db
      .update(deliveryRequests)
      .set({ 
        driverId,
        status: 'ACCEPTED',
      })
      .where(eq(deliveryRequests.id, jobId));
  }

  async getDriverEarnings(userId: number): Promise<{ todayEarnings: number; weeklyEarnings: number; totalEarnings: number; completedDeliveries: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const completedDeliveries = await db
      .select()
      .from(deliveryRequests)
      .where(
        and(
          eq(deliveryRequests.driverId, userId),
          eq(deliveryRequests.status, 'DELIVERED')
        )
      );

    const todayDeliveries = completedDeliveries.filter(d => 
      d.completedAt && new Date(d.completedAt) >= today
    );

    const weeklyDeliveries = completedDeliveries.filter(d => 
      d.completedAt && new Date(d.completedAt) >= weekAgo
    );

    return {
      todayEarnings: todayDeliveries.reduce((sum, d) => sum + parseFloat(d.deliveryFee || '0'), 0),
      weeklyEarnings: weeklyDeliveries.reduce((sum, d) => sum + parseFloat(d.deliveryFee || '0'), 0),
      totalEarnings: completedDeliveries.reduce((sum, d) => sum + parseFloat(d.deliveryFee || '0'), 0),
      completedDeliveries: completedDeliveries.length
    };
  }

  async getDriverDeliveryHistory(userId: number): Promise<DeliveryRequest[]> {
    const deliveries = await db
      .select()
      .from(deliveryRequests)
      .where(eq(deliveryRequests.driverId, userId))
      .orderBy(desc(deliveryRequests.createdAt));

    return deliveries;
  }

  async getDriverOrders(driverId: number, status?: string): Promise<any[]> {
    let query = db
      .select()
      .from(deliveryRequests)
      .where(eq(deliveryRequests.driverId, driverId));

    if (status) {
      query = query.where(eq(deliveryRequests.status, status as any));
    }

    const orders = await query.orderBy(desc(deliveryRequests.createdAt));
    return orders;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const categories = await db.select().from(categories).where(eq(categories.isActive, true));
    return categories;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  // Products
  async getProducts(filters: { categoryId?: number; search?: string; limit?: number; offset?: number }): Promise<Product[]> {
    let query = db.select().from(products).where(eq(products.isActive, true));

    if (filters.categoryId) {
      query = query.where(eq(products.categoryId, filters.categoryId));
    }

    if (filters.search) {
      query = query.where(
        or(
          like(products.name, `%${filters.search}%`),
          like(products.description, `%${filters.search}%`)
        )
      );
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const productsList = await query.orderBy(desc(products.createdAt));
    return productsList;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  // Cart operations
  async getCartItems(userId: number): Promise<CartItem[]> {
    const cartItems = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.userId, userId));
    return cartItems;
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    const [newCartItem] = await db
      .insert(cartItems)
      .values(cartItem)
      .returning();
    return newCartItem;
  }

  async updateCartItem(cartItemId: number, quantity: number): Promise<CartItem> {
    const [updatedItem] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, cartItemId))
      .returning();
    return updatedItem;
  }

  async removeFromCart(cartItemId: number): Promise<void> {
    await db
      .delete(cartItems)
      .where(eq(cartItems.id, cartItemId));
  }

  // Vendor Feed operations
  async getVendorPosts(filters: { limit?: number; offset?: number; vendorId?: number; postType?: string }): Promise<VendorPost[]> {
    let query = db.select().from(vendorPosts).where(eq(vendorPosts.isActive, true));

    if (filters.vendorId) {
      query = query.where(eq(vendorPosts.vendorId, filters.vendorId));
    }

    if (filters.postType) {
      query = query.where(eq(vendorPosts.postType, filters.postType as any));
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const posts = await query.orderBy(desc(vendorPosts.createdAt));
    return posts;
  }

  async createVendorPost(post: InsertVendorPost): Promise<VendorPost> {
    const [newPost] = await db
      .insert(vendorPosts)
      .values(post)
      .returning();
    return newPost;
  }

  async likeVendorPost(postId: string, userId: number): Promise<VendorPostLike> {
    const [like] = await db
      .insert(vendorPostLikes)
      .values({ postId, userId })
      .returning();

    // Update like count
    await db
      .update(vendorPosts)
      .set({ likeCount: sql`${vendorPosts.likeCount} + 1` })
      .where(eq(vendorPosts.id, postId));

    return like;
  }

  async unlikeVendorPost(postId: string, userId: number): Promise<void> {
    await db
      .delete(vendorPostLikes)
      .where(and(eq(vendorPostLikes.postId, postId), eq(vendorPostLikes.userId, userId)));

    // Update like count
    await db
      .update(vendorPosts)
      .set({ likeCount: sql`${vendorPosts.likeCount} - 1` })
      .where(eq(vendorPosts.id, postId));
  }

  async getVendorPostLikes(postId: string): Promise<VendorPostLike[]> {
    const likes = await db
      .select()
      .from(vendorPostLikes)
      .where(eq(vendorPostLikes.postId, postId));
    return likes;
  }

  async commentOnVendorPost(comment: InsertVendorPostComment): Promise<VendorPostComment> {
    const [newComment] = await db
      .insert(vendorPostComments)
      .values(comment)
      .returning();

    // Update comment count
    await db
      .update(vendorPosts)
      .set({ commentCount: sql`${vendorPosts.commentCount} + 1` })
      .where(eq(vendorPosts.id, comment.postId));

    return newComment;
  }

  async getVendorPostComments(postId: string): Promise<VendorPostComment[]> {
    const comments = await db
      .select()
      .from(vendorPostComments)
      .where(and(eq(vendorPostComments.postId, postId), eq(vendorPostComments.isActive, true)))
      .orderBy(desc(vendorPostComments.createdAt));
    return comments;
  }

  // Placeholder implementations for remaining methods
  async getMerchantProfile(userId: number): Promise<MerchantProfile | undefined> {
    const [profile] = await db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, userId));
    return profile || undefined;
  }

  async createMerchantProfile(profile: InsertMerchantProfile): Promise<MerchantProfile> {
    const [merchantProfile] = await db
      .insert(merchantProfiles)
      .values(profile)
      .returning();
    return merchantProfile;
  }

  async getMerchantDashboardStats(userId: number): Promise<{ todayRevenue: number; ordersCount: number; productViews: number; unreadMessages: number }> {
    // Implement real stats calculation
    return {
      todayRevenue: 0,
      ordersCount: 0,
      productViews: 0,
      unreadMessages: 0
    };
  }

  async getMerchantOrders(userId: number): Promise<Order[]> {
    const orders = await db
      .select()
      .from(orders)
      .where(eq(orders.sellerId, userId))
      .orderBy(desc(orders.createdAt));
    return orders;
  }

  async updateOrderStatus(orderId: string, status: string, merchantId: number): Promise<void> {
    await db
      .update(orders)
      .set({ status: status as any })
      .where(and(eq(orders.id, orderId), eq(orders.sellerId, merchantId)));
  }

  async getMerchantAnalytics(userId: number, period: string): Promise<MerchantAnalytics[]> {
    const analytics = await db
      .select()
      .from(merchantAnalytics)
      .where(eq(merchantAnalytics.merchantId, userId))
      .orderBy(desc(merchantAnalytics.date));
    return analytics;
  }

  async createDeliveryRequest(request: InsertDeliveryRequest): Promise<DeliveryRequest> {
    const [deliveryRequest] = await db
      .insert(deliveryRequests)
      .values(request)
      .returning();
    return deliveryRequest;
  }

  async getConversations(userId: number, role?: string): Promise<any[]> {
    let query = db
      .select()
      .from(conversations);

    if (role === 'CONSUMER') {
      query = query.where(eq(conversations.customerId, userId));
    } else if (role === 'MERCHANT') {
      query = query.where(eq(conversations.vendorId, userId));
    } else {
      query = query.where(
        or(
          eq(conversations.customerId, userId),
          eq(conversations.vendorId, userId)
        )
      );
    }

    const conversationsList = await query.orderBy(desc(conversations.lastMessageAt));
    return conversationsList;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getMessages(conversationId: string): Promise<any[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
    return messages;
  }

  async sendMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();

    // Update conversation last message
    await db
      .update(conversations)
      .set({
        lastMessage: message.content,
        lastMessageAt: new Date()
      })
      .where(eq(conversations.id, message.conversationId));

    return newMessage;
  }

  async getConversationMessages(conversationId: string, limit: number, offset: number): Promise<any[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset);

    return messages;
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const ticketNumber = `TK-${Date.now()}`;
    const [supportTicket] = await db
      .insert(supportTickets)
      .values({
        ticketNumber,
        name: ticket.userEmail.split('@')[0],
        email: ticket.userEmail,
        userRole: ticket.userRole,
        subject: ticket.subject,
        message: ticket.description,
        priority: ticket.priority === 'URGENT' ? 'HIGH' : ticket.priority as any,
      })
      .returning();
    return supportTicket;
  }

  async getSupportTickets(filters?: { status?: string; priority?: string; userRole?: string }): Promise<SupportTicket[]> {
    let query = db.select().from(supportTickets);

    if (filters?.status) {
      query = query.where(eq(supportTickets.status, filters.status as any));
    }

    if (filters?.priority) {
      query = query.where(eq(supportTickets.priority, filters.priority as any));
    }

    if (filters?.userRole) {
      query = query.where(eq(supportTickets.userRole, filters.userRole as any));
    }

    const tickets = await query.orderBy(desc(supportTickets.createdAt));
    return tickets;
  }

  async getSupportTicket(ticketId: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    return ticket || undefined;
  }

  async updateSupportTicket(ticketId: string, updateData: Partial<SupportTicket>): Promise<SupportTicket> {
    const [updatedTicket] = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return updatedTicket;
  }

  // Identity verification methods (placeholder implementations)
  async createIdentityVerification(data: any): Promise<any> {
    const [verification] = await db
      .insert(identityVerifications)
      .values(data)
      .returning();
    return verification;
  }

  async getIdentityVerificationByUserId(userId: number): Promise<any | null> {
    const [verification] = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.userId, userId));
    return verification || null;
  }

  async createDriverVerification(data: any): Promise<any> {
    const [verification] = await db
      .insert(driverVerifications)
      .values(data)
      .returning();
    return verification;
  }

  async getDriverVerificationByUserId(userId: number): Promise<any | null> {
    const [verification] = await db
      .select()
      .from(driverVerifications)
      .where(eq(driverVerifications.userId, userId));
    return verification || null;
  }

  async createPhoneVerification(data: any): Promise<any> {
    const [verification] = await db
      .insert(phoneVerifications)
      .values(data)
      .returning();
    return verification;
  }

  async verifyPhoneOTP(userId: number, otpCode: string): Promise<any | null> {
    const [verification] = await db
      .select()
      .from(phoneVerifications)
      .where(
        and(
          eq(phoneVerifications.userId, userId),
          eq(phoneVerifications.otpCode, otpCode),
          gte(phoneVerifications.expiresAt, new Date())
        )
      );

    if (verification) {
      await db
        .update(phoneVerifications)
        .set({ isVerified: true })
        .where(eq(phoneVerifications.id, verification.id));

      await db
        .update(users)
        .set({ isPhoneVerified: true })
        .where(eq(users.id, userId));
    }

    return verification || null;
  }

  async updateUser(userId: number, data: any): Promise<any> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Payment and transaction methods
  async getUserWallet(userId: number): Promise<any> {
    const wallets = await import("@shared/schema").then(m => m.wallets);
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet || null;
  }

  async createWallet(userId: number): Promise<any> {
    const wallets = await import("@shared/schema").then(m => m.wallets);
    const [wallet] = await db
      .insert(wallets)
      .values({ userId, balance: "0.00", currency: "NGN" })
      .returning();
    return wallet;
  }

  async updateWalletBalance(userId: number, amount: string): Promise<any> {
    const wallets = await import("@shared/schema").then(m => m.wallets);
    const [wallet] = await db
      .update(wallets)
      .set({ balance: amount, lastActivity: new Date(), updatedAt: new Date() })
      .where(eq(wallets.userId, userId))
      .returning();
    return wallet;
  }

  async getUserPaymentMethods(userId: number): Promise<any[]> {
    const paymentMethods = await import("@shared/schema").then(m => m.paymentMethods);
    const methods = await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.isActive, true)))
      .orderBy(desc(paymentMethods.createdAt));
    return methods;
  }

  async createPaymentMethod(data: any): Promise<any> {
    const paymentMethods = await import("@shared/schema").then(m => m.paymentMethods);
    const [method] = await db
      .insert(paymentMethods)
      .values(data)
      .returning();
    return method;
  }

  async getUserTransactions(userId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    const transactions = await import("@shared/schema").then(m => m.transactions);
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
    return userTransactions;
  }

  async createTransaction(data: any): Promise<any> {
    const transactions = await import("@shared/schema").then(m => m.transactions);
    const [transaction] = await db
      .insert(transactions)
      .values(data)
      .returning();
    return transaction;
  }

  async updateTransaction(transactionId: string, data: any): Promise<any> {
    const transactions = await import("@shared/schema").then(m => m.transactions);
    const [transaction] = await db
      .update(transactions)
      .set(data)
      .where(eq(transactions.id, transactionId))
      .returning();
    return transaction;
  }

  async getTransactionByReference(reference: string): Promise<any> {
    const transactions = await import("@shared/schema").then(m => m.transactions);
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.paystackReference, reference));
    return transaction || null;
  }

  // Fuel order operations (placeholder implementations)
  async getNearbyFuelStations(latitude: number, longitude: number, radius: number): Promise<any> {
    // Mock implementation - replace with real fuel station data
    return [
      {
        id: 'station-1',
        name: 'Shell Station Lagos',
        latitude: latitude + 0.01,
        longitude: longitude + 0.01,
        fuelTypes: ['PMS', 'AGO', 'DPK'],
        prices: { PMS: 617, AGO: 650, DPK: 800 }
      }
    ];
  }

  async createFuelOrder(data: any): Promise<any> {
    // Implement fuel order creation
    return { id: `fuel-${Date.now()}`, ...data, status: 'PENDING' };
  }

  async getFuelOrders(userId: number): Promise<any> {
    // Implement fuel orders retrieval
    return [];
  }

  async updateFuelOrderStatus(orderId: string, status: string, driverId?: number): Promise<any> {
    // Implement fuel order status update
    return { id: orderId, status, driverId };
  }

  async getAvailableFuelOrders(): Promise<any> {
    // Implement available fuel orders retrieval
    return [];
  }

  async storePushSubscription(userId: number, subscription: any): Promise<any> {
    // Implement push subscription storage
    return { userId, subscription };
  }

  async removePushSubscription(userId: number): Promise<any> {
    // Implement push subscription removal
    return { userId };
  }

  async searchMerchants(params: { latitude?: number; longitude?: number; radius?: number; category?: string; searchTerm?: string }): Promise<any[]> {
    // Implement merchant search
    return [];
  }

  async getMerchantProducts(merchantId: number): Promise<Product[]> {
    const products = await db
      .select()
      .from(products)
      .where(and(eq(products.sellerId, merchantId), eq(products.isActive, true)))
      .orderBy(desc(products.createdAt));
    return products;
  }

  async getFuelStations(params: { latitude?: number; longitude?: number; radius?: number; fuelType?: string }): Promise<any[]> {
    // Implement fuel station search
    return [];
  }

  // Payment and Wallet operations
  async getUserWallet(userId: number): Promise<any> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet || null;
  }

  async createWallet(userId: number): Promise<any> {
    const [wallet] = await db
      .insert(wallets)
      .values({
        userId,
        balance: "0.00",
        currency: "NGN",
        isActive: true
      })
      .returning();
    return wallet;
  }

  async getUserPaymentMethods(userId: number): Promise<any[]> {
    const methods = await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.isActive, true)))
      .orderBy(desc(paymentMethods.createdAt));
    return methods;
  }

  async getUserTransactions(userId: number, limit: number, offset: number): Promise<any[]> {
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(or(
        eq(transactions.userId, userId),
        eq(transactions.recipientId, userId)
      ))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
    return userTransactions;
  }

  async addToWishlist(userId: number, productId: string): Promise<any> {
    // Simple wishlist implementation - you may want to create a dedicated wishlist table
    // For now, we'll use a simple approach
    return { userId, productId, addedAt: new Date() };
  }

  async getWishlistItems(userId: number): Promise<any[]> {
    // Mock implementation - would need a dedicated wishlist table
    return [];
  }

  // QR Code operations
  async generateDeliveryQR(orderId: string): Promise<any> {
    const qrCode = `DELIVERY_${orderId}_${Date.now()}`;
    const [confirmation] = await db
      .insert(deliveryConfirmations)
      .values({
        orderId,
        qrCode,
        scanned: false
      })
      .returning();
    return confirmation;
  }

  async verifyDeliveryQR(qrCode: string): Promise<any> {
    const [confirmation] = await db
      .select()
      .from(deliveryConfirmations)
      .where(and(
        eq(deliveryConfirmations.qrCode, qrCode),
        eq(deliveryConfirmations.scanned, false)
      ));

    if (confirmation) {
      // Mark as scanned
      await db
        .update(deliveryConfirmations)
        .set({ 
          scanned: true,
          scannedAt: new Date()
        })
        .where(eq(deliveryConfirmations.id, confirmation.id));

      return { ...confirmation, valid: true };
    }

    return { valid: false };
  }

  // Real-time order tracking
  async updateOrderTracking(orderId: string, status: string, location?: any): Promise<any> {
    const updateData: any = { 
      status: status as any,
      updatedAt: new Date()
    };

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder;
  }

  async getOrderTracking(orderId: string): Promise<any> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) return null;

    // Get delivery confirmations
    const confirmations = await db
      .select()
      .from(deliveryConfirmations)
      .where(eq(deliveryConfirmations.orderId, orderId));

    return {
      ...order,
      deliveryConfirmations: confirmations
    };
  }
}

export const storage = new DatabaseStorage();