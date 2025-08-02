import { 
  users, otpCodes, categories, products, cartItems, userLocations, orders,
  vendorPosts, vendorPostLikes, vendorPostComments, conversations, chatMessages,
  driverProfiles, merchantProfiles, deliveryRequests, merchantAnalytics, supportTickets,
  identityVerifications, driverVerifications, phoneVerifications,
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
import { eq, and, gte, like, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySocialId(socialProvider: string, socialId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createSocialUser(userData: { fullName: string; email: string; socialProvider: string; socialId: string; profilePicture?: string }): Promise<User>;
  verifyUser(email: string): Promise<void>;
  generateUserId(): Promise<string>;

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

  // Wishlist operations (placeholder for future implementation)
  addToWishlist(userId: number, productId: number): Promise<void>;
  removeFromWishlist(userId: number, productId: number): Promise<void>;
  getWishlistItems(userId: number): Promise<any[]>;

  // Chat operations
  getConversations(userId: number, role?: string): Promise<any[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getMessages(conversationId: string): Promise<any[]>;
  sendMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Vendor Feed operations
  getVendorPosts(filters: { limit?: number; offset?: number; vendorId?: number; postType?: string }): Promise<VendorPost[]>;
  createVendorPost(post: InsertVendorPost): Promise<VendorPost>;
  likeVendorPost(postId: string, userId: number): Promise<VendorPostLike>;
  unlikeVendorPost(postId: string, userId: number): Promise<void>;
  getVendorPostLikes(postId: string): Promise<VendorPostLike[]>;
  commentOnVendorPost(comment: InsertVendorPostComment): Promise<VendorPostComment>;
  getVendorPostComments(postId: string): Promise<VendorPostComment[]>;

  // Driver operations
  getDriverProfile(userId: number): Promise<DriverProfile | undefined>;
  createDriverProfile(profile: InsertDriverProfile): Promise<DriverProfile>;
  updateDriverLocation(userId: number, location: { latitude: string; longitude: string; accuracy?: number }): Promise<void>;
  getAvailableDeliveryJobs(): Promise<DeliveryRequest[]>;
  acceptDeliveryJob(jobId: string, driverId: number): Promise<void>;
  getDriverEarnings(userId: number): Promise<{ todayEarnings: number; weeklyEarnings: number; totalEarnings: number; completedDeliveries: number }>;
  getDriverDeliveryHistory(userId: number): Promise<DeliveryRequest[]>;

  // Merchant operations
  getMerchantProfile(userId: number): Promise<MerchantProfile | undefined>;
  createMerchantProfile(profile: InsertMerchantProfile): Promise<MerchantProfile>;
  getMerchantDashboardStats(userId: number): Promise<{ todayRevenue: number; ordersCount: number; productViews: number; unreadMessages: number }>;
  getMerchantOrders(userId: number): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: string, merchantId: number): Promise<void>;
  getMerchantAnalytics(userId: number, period: string): Promise<MerchantAnalytics[]>;
  createDeliveryRequest(request: InsertDeliveryRequest): Promise<DeliveryRequest>;

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

    //Missing social login storage methods
  linkSocialAccount(userId: number, provider: string, socialId: string, profilePicture?: string): Promise<any>;
  updateUserProfilePicture(userId: number, profilePicture: string): Promise<any>;
  storePushSubscription(userId: number, subscription: any): Promise<any>;
  removePushSubscription(userId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  private fuelOrders?: Map<string, any>; // Temporary storage for fuel orders

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
    // Get the latest user ID to generate the next sequential ID
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

  async createSocialUser(userData: { fullName: string; email: string; socialProvider: string; socialId: string; profilePicture?: string }): Promise<User> {
    const userId = await this.generateUserId();
    const [user] = await db
      .insert(users)
      .values({
        userId,
        fullName: userData.fullName,
        email: userData.email,
        phone: '', // Will be updated later
        password: '', // Social login users don't need passwords
        role: 'CONSUMER', // Default role for social login
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
    // First try to update existing active location
    const [existingLocation] = await db
      .update(userLocations)
      .set({
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        updatedAt: new Date(),
        isActive: true
      })
      .where(
        and(
          eq(userLocations.userId, location.userId),
          eq(userLocations.isActive, true)
        )
      )
      .returning();

    if (existingLocation) {
      return existingLocation;
    }

    // If no existing location, create new one
    const [newLocation] = await db
      .insert(userLocations)
      .values(location)
      .returning();

    return newLocation;
  }

  async getNearbyUsers(lat: number, lng: number, radiusMeters: number, excludeRole?: string): Promise<UserLocation[]> {
    // Use Haversine formula to calculate distance
    const baseConditions = [
      eq(userLocations.isActive, true),
      sql`(6371000 * acos(cos(radians(${lat})) * cos(radians(${userLocations.latitude})) * cos(radians(${userLocations.longitude}) - radians(${lng})) + sin(radians(${lat})) * sin(radians(${userLocations.latitude})))) <= ${radiusMeters}`
    ];

    if (excludeRole) {
      baseConditions.push(sql`${users.role} != ${excludeRole}`);
    }

    const nearbyUsers = await db
      .select({
        id: userLocations.id,
        userId: userLocations.userId,
        latitude: userLocations.latitude,
        longitude: userLocations.longitude,
        address: userLocations.address,
        isActive: userLocations.isActive,
        createdAt: userLocations.createdAt,
        updatedAt: userLocations.updatedAt,
        fullName: users.fullName,
        role: users.role
      })
      .from(userLocations)
      .innerJoin(users, eq(userLocations.userId, users.id))
      .where(and(...baseConditions));

    return nearbyUsers;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    // First check if categories exist in database
    const existingCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.name);

    // If no categories exist, seed with default business categories
    if (existingCategories.length === 0) {
      const defaultCategories = [
        { name: "Apparel & Clothing", icon: "Shirt", slug: "apparel-clothing", description: "Fashion, clothing, and accessories" },
        { name: "Art & Entertainment", icon: "Palette", slug: "art-entertainment", description: "Creative arts and entertainment services" },
        { name: "Beauty & Cosmetics", icon: "Sparkles", slug: "beauty-cosmetics", description: "Beauty products and cosmetic services" },
        { name: "Education", icon: "GraduationCap", slug: "education", description: "Educational services and institutions" },
        { name: "Event Planning", icon: "Calendar", slug: "event-planning", description: "Event organization and planning services" },
        { name: "Finance", icon: "DollarSign", slug: "finance", description: "Financial services and consulting" },
        { name: "Supermarket", icon: "ShoppingBasket", slug: "supermarket", description: "Grocery stores and supermarkets" },
        { name: "Hotel", icon: "Building2", slug: "hotel", description: "Hotels and accommodation services" },
        { name: "Medical & Health", icon: "Heart", slug: "medical-health", description: "Healthcare and medical services" },
        { name: "Non-profit", icon: "Users", slug: "non-profit", description: "Non-profit organizations and charities" },
        { name: "Oil & Gas", icon: "Fuel", slug: "oil-gas", description: "Energy and petroleum services" },
        { name: "Restaurant", icon: "UtensilsCrossed", slug: "restaurant", description: "Restaurants and food services" },
        { name: "Shopping & Retail", icon: "Store", slug: "shopping-retail", description: "Retail stores and shopping centers" },
        { name: "Ticket", icon: "Ticket", slug: "ticket", description: "Ticket sales and booking services" },
        { name: "Toll Gate", icon: "MapPin", slug: "toll-gate", description: "Toll gate and road services" },
        { name: "Vehicle Service", icon: "Car", slug: "vehicle-service", description: "Automotive services and repairs" },
        { name: "Other Business", icon: "Briefcase", slug: "other-business", description: "Miscellaneous business services" }
      ];

      // Insert default categories
      for (const category of defaultCategories) {
        await db.insert(categories).values(category);
      }

      // Return the newly seeded categories
      return await db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(categories.name);
    }

    return existingCategories;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  // Product operations
  async getProducts(filters: { categoryId?: number; search?: string; limit?: number; offset?: number }): Promise<Product[]> {
    const conditions = [eq(products.isActive, true)];

    if (filters.categoryId) {
      conditions.push(eq(products.categoryId, filters.categoryId));
    }

    if (filters.search) {
      conditions.push(
        sql`${products.name} ILIKE ${`%${filters.search}%`} OR ${products.description} ILIKE ${`%${filters.search}%`}`
      );
    }

    const queryBuilder = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        unit: products.unit,
        categoryId: products.categoryId,
        sellerId: products.sellerId,
        image: products.image,
        rating: products.rating,
        reviewCount: products.reviewCount,
        inStock: products.inStock,
        minimumOrder: products.minimumOrder,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: categories.name,
        sellerName: users.fullName,
        sellerLocation: users.city
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(products.createdAt));

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    return await queryBuilder;
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
    return await db
      .select({
        id: cartItems.id,
        userId: cartItems.userId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        createdAt: cartItems.createdAt,
        productName: products.name,
        productPrice: products.price,
        productUnit: products.unit,
        productImage: products.image,
        sellerName: users.fullName
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(eq(cartItems.userId, userId))
      .orderBy(desc(cartItems.createdAt));
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, cartItem.userId),
          eq(cartItems.productId, cartItem.productId)
        )
      );

    if (existingItem) {
      // Update quantity if item exists
      const [updatedItem] = await db
        .update(cartItems)
        .set({ quantity: existingItem.quantity + cartItem.quantity })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updatedItem;
    } else {
      // Add new item to cart
      const [newItem] = await db
        .insert(cartItems)
        .values(cartItem)
        .returning();
      return newItem;
    }
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
    // For now, return sample data that matches the actual data structure
    // This will be replaced with real database queries once schema is deployed
    const samplePosts: VendorPost[] = [
      {
        id: "1",
        vendorId: 1,
        title: "New Stock Alert: Premium Rice Collection",
        content: "Just received fresh shipment of premium long grain rice. Perfect for families and restaurants. Limited quantity available!",
        postType: "NEW_PRODUCT",
        productId: "prod-1",
        images: ["/api/placeholder/400/300"],
        tags: ["rice", "premium", "fresh"],
        originalPrice: "45000",
        discountPrice: "40000",
        discountPercentage: 11,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isActive: true,
        viewCount: 125,
        likeCount: 23,
        commentCount: 8,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        vendorName: "Golden Grains Store",
        vendorProfilePicture: "/api/placeholder/50/50",
        productName: "Premium Long Grain Rice (50kg)",
        productPrice: "40000",
        productImage: "/api/placeholder/100/100"
      },
      {
        id: "2", 
        vendorId: 2,
        title: "Flash Sale: Electronics Clearance",
        content: "Clearing out last season's electronics. Phones, tablets, and accessories at unbeatable prices. While stocks last!",
        postType: "PROMOTION",
        productId: "prod-2",
        images: ["/api/placeholder/400/300"],
        tags: ["electronics", "sale", "clearance"],
        originalPrice: "150000",
        discountPrice: "95000",
        discountPercentage: 37,
        validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        isActive: true,
        viewCount: 89,
        likeCount: 15,
        commentCount: 12,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        vendorName: "TechHub Electronics",
        vendorProfilePicture: "/api/placeholder/50/50",
        productName: "Samsung Galaxy Tablet",
        productPrice: "95000",
        productImage: "/api/placeholder/100/100"
      },
      {
        id: "3",
        vendorId: 3,
        title: "Store Announcement: Extended Hours",
        content: "We're now open 24/7 to serve you better! Visit us anytime for fresh groceries and household essentials.",
        postType: "ANNOUNCEMENT",
        productId: null,
        images: [],
        tags: ["announcement", "hours", "service"],
        originalPrice: null,
        discountPrice: null,
        discountPercentage: null,
        validUntil: null,
        isActive: true,
        viewCount: 156,
        likeCount: 31,
        commentCount: 5,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        vendorName: "Fresh Market Express",
        vendorProfilePicture: "/api/placeholder/50/50",
        productName: null,
        productPrice: null,
        productImage: null
      }
    ];

    return samplePosts.slice(0, filters.limit || 20);
  }

  async createVendorPost(insertPost: InsertVendorPost): Promise<VendorPost> {
    // Simulate creating a new post with real data structure
    const newPost: VendorPost = {
      id: Math.random().toString(36).substr(2, 9),
      vendorId: insertPost.vendorId,
      title: insertPost.title,
      content: insertPost.content,
      postType: insertPost.postType,
      productId: insertPost.productId || null,
      images: insertPost.images || [],
      tags: insertPost.tags || [],
      originalPrice: insertPost.originalPrice || null,
      discountPrice: insertPost.discountPrice || null,
      discountPercentage: insertPost.discountPercentage || null,
      validUntil: insertPost.validUntil || null,
      isActive: true,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      vendorName: "Current User", // Would get from user lookup
      vendorProfilePicture: "/api/placeholder/50/50",
      productName: insertPost.productId ? "Sample Product" : null,
      productPrice: insertPost.discountPrice || insertPost.originalPrice || null,
      productImage: insertPost.productId ? "/api/placeholder/100/100" : null
    };

    console.log("Created vendor post:", newPost);
    return newPost;
  }

  async likeVendorPost(postId: string, userId: number): Promise<VendorPostLike> {
    // Placeholder implementation
    return {} as VendorPostLike;
  }

  async unlikeVendorPost(postId: string, userId: number): Promise<void> {
    // Placeholder implementation
  }

  async getVendorPostLikes(postId: string): Promise<VendorPostLike[]> {
    return [];
  }

  async commentOnVendorPost(insertComment: InsertVendorPostComment): Promise<VendorPostComment> {
    // Placeholder implementation
    return {} as VendorPostComment;
  }

  async getVendorPostComments(postId: string): Promise<VendorPostComment[]> {
    return [];
  }

  // Wishlist operations (placeholder implementations)
  async addToWishlist(userId: number, productId: number): Promise<void> {
    // Placeholder - will implement with proper wishlist table later
    console.log(`Added product ${productId} to wishlist for user ${userId}`);
  }

  async removeFromWishlist(userId: number, productId: number): Promise<void> {
    // Placeholder - will implement with proper wishlist table later
    console.log(`Removed product ${productId} from wishlist for user ${userId}`);
  }

  async getWishlistItems(userId: number): Promise<any[]> {
    // Placeholder - will implement with proper wishlist table later
    return [];
  }

  // Chat operations (using structured sample data for testing)
  async getConversations(userId: number, role?: string): Promise<any[]> {
    // Get user's actual profile picture
    const user = await this.getUser(userId);
    const userPhoto = user?.profilePicture;

    // Return role-based conversations
    const allConversations = [
      // Consumer-Merchant Quote Discussion
      {
        id: "conv-1",
        customerId: 1,
        vendorId: 2,
        productId: "734e20c5-04e3-49ab-a770-c85fcb2e8b2b",
        conversationType: "QUOTE",
        status: "ACTIVE",
        customerName: "Isaiah Salba",
        vendorName: "Golden Grains Store",
        customerPhoto: userPhoto,
        vendorPhoto: null,
        productName: "Designer Jeans",
        lastMessage: "What's your best price for bulk orders?",
        lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      // Consumer-Merchant Order Management
      {
        id: "conv-2",
        customerId: 1,
        vendorId: 3,
        productId: "6741b646-aa7a-4d8a-9f07-eba7653b53d6",
        conversationType: "ORDER",
        status: "ACTIVE",
        customerName: "Isaiah Salba",
        vendorName: "TechHub Electronics",
        customerPhoto: userPhoto,
        vendorPhoto: null,
        productName: "Organic Face Cream",
        lastMessage: "Order confirmed. When can I expect delivery?",
        lastMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      // Driver-Merchant Pickup Request
      {
        id: "conv-3",
        customerId: 1,
        vendorId: 2,
        driverId: 4,
        productId: "734e20c5-04e3-49ab-a770-c85fcb2e8b2b",
        conversationType: "PICKUP",
        status: "ACTIVE",
        customerName: "Isaiah Salba",
        vendorName: "Golden Grains Store",
        driverName: "Mike Wilson",
        customerPhoto: userPhoto,
        vendorPhoto: null,
        driverPhoto: null,
        productName: "Designer Jeans",
        lastMessage: "Package ready for pickup at store location",
        lastMessageAt: new Date(Date.now() - 30 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      // Driver-Customer Delivery Service
      {
        id: "conv-4",
        customerId: 1,
        vendorId: 3,
        driverId: 4,
        productId: "6741b646-aa7a-4d8a-9f07-eba7653b53d6",
        conversationType: "DELIVERY",
        status: "ACTIVE",
        customerName: "Isaiah Salba",
        vendorName: "TechHub Electronics",
        driverName: "Mike Wilson",
        customerPhoto: userPhoto,
        vendorPhoto: null,
        driverPhoto: null,
        productName: "Organic Face Cream",
        lastMessage: "On the way to your delivery address",
        lastMessageAt: new Date(Date.now() - 15 * 60 * 1000),
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      }
    ];

    // Filter conversations based on user role
    if (role === "CONSUMER") {
      return allConversations.filter(conv => 
        conv.customerId === userId && 
        (conv.conversationType === "QUOTE" || conv.conversationType === "ORDER" || conv.conversationType === "DELIVERY")
      );
    } else if (role === "MERCHANT") {
      return allConversations.filter(conv => 
        conv.vendorId === userId && 
        (conv.conversationType === "QUOTE" || conv.conversationType === "ORDER" || conv.conversationType === "PICKUP")
      );
    } else if (role === "DRIVER") {
      return allConversations.filter(conv => 
        conv.driverId === userId && 
        (conv.conversationType === "PICKUP" || conv.conversationType === "DELIVERY")
      );
    }

    // Default: return user's conversations
    return allConversations.filter(conv => 
      conv.customerId === userId || conv.vendorId === userId || conv.driverId === userId
    );
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const newConversation = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: conversation.customerId,
      vendorId: conversation.vendorId,
      productId: conversation.productId || null,
      conversationType: conversation.conversationType,
      status: "ACTIVE" as const,
      lastMessage: null,
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log("Created conversation:", newConversation);
    return newConversation;
  }

  async getMessages(conversationId: string): Promise<any[]> {
    // Return sample messages for testing
    return [
      {
        id: "msg-1",
        conversationId,
        senderId: 2,
        senderName: "John Doe",
        senderRole: "CONSUMER",
        content: "Hi, I'm interested in your premium rice. What's your best price for bulk orders of 100+ bags?",
        messageType: "QUOTE_REQUEST",
        attachedData: null,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        id: "msg-2", 
        conversationId,
        senderId: 1,
        senderName: "GoldenGrains Store",
        senderRole: "MERCHANT",
        content: "Hello! For orders of 100+ bags, I can offer 15% discount. That brings the price to ₦34,000 per bag. Quality guaranteed!",
        messageType: "QUOTE_RESPONSE",
        attachedData: { originalPrice: 40000, discountPrice: 34000, quantity: 100 },
        createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000)
      },
      {
        id: "msg-3",
        conversationId,
        senderId: 2,
        senderName: "John Doe", 
        senderRole: "CONSUMER",
        content: "That sounds good! Can you guarantee delivery within 48 hours to Lagos?",
        messageType: "TEXT",
        attachedData: null,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];
  }

  async sendMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType || "TEXT",
      attachedData: message.attachedData || null,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log("Sent message:", newMessage);
    return newMessage;
  }

  // Driver operations implementation
  async getDriverProfile(userId: number): Promise<DriverProfile | undefined> {
    const [profile] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, userId));
    return profile || undefined;
  }

  async createDriverProfile(profile: InsertDriverProfile): Promise<DriverProfile> {
    const [newProfile] = await db.insert(driverProfiles).values(profile).returning();
    return newProfile;
  }

  async updateDriverLocation(userId: number, location: { latitude: string; longitude: string; accuracy?: number }): Promise<void> {
    await db.update(driverProfiles)
      .set({ 
        currentLocation: { 
          lat: parseFloat(location.latitude), 
          lng: parseFloat(location.longitude),
          accuracy: location.accuracy || 10,
          timestamp: new Date().toISOString()
        },
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, userId));
  }

  async getAvailableDeliveryJobs(): Promise<DeliveryRequest[]> {
    const jobs = await db.select({
      id: deliveryRequests.id,
      customerId: deliveryRequests.customerId,
      merchantId: deliveryRequests.merchantId,
      deliveryType: deliveryRequests.deliveryType,
      pickupAddress: deliveryRequests.pickupAddress,
      deliveryAddress: deliveryRequests.deliveryAddress,
      estimatedDistance: deliveryRequests.estimatedDistance,
      deliveryFee: deliveryRequests.deliveryFee,
      status: deliveryRequests.status,
      scheduledTime: deliveryRequests.scheduledTime,
      notes: deliveryRequests.notes,
      createdAt: deliveryRequests.createdAt,
      customer: {
        fullName: users.fullName,
        phone: users.phone
      }
    })
    .from(deliveryRequests)
    .leftJoin(users, eq(deliveryRequests.customerId, users.id))
    .where(eq(deliveryRequests.status, 'PENDING'))
    .orderBy(desc(deliveryRequests.createdAt))
    .limit(20);

    return jobs;
  }

  async acceptDeliveryJob(jobId: string, driverId: number): Promise<void> {
    await db.update(deliveryRequests)
      .set({ 
        driverId,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(deliveryRequests.id, jobId));
  }

  async getDriverEarnings(userId: number): Promise<{ todayEarnings: number; weeklyEarnings: number; totalEarnings: number; completedDeliveries: number }> {
    const profile = await this.getDriverProfile(userId);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get today's earnings
    const todayDeliveries = await db.select()
      .from(deliveryRequests)
      .where(
        and(
          eq(deliveryRequests.driverId, userId),
          eq(deliveryRequests.status, 'DELIVERED'),
          gte(deliveryRequests.deliveredAt, startOfDay)
        )
      );

    // Get weekly earnings
    const weeklyDeliveries = await db.select()
      .from(deliveryRequests)
      .where(
        and(
          eq(deliveryRequests.driverId, userId),
          eq(deliveryRequests.status, 'DELIVERED'),
          gte(deliveryRequests.deliveredAt, startOfWeek)
        )
      );

    const todayEarnings = todayDeliveries.reduce((sum, delivery) => 
      sum + parseFloat(delivery.deliveryFee || '0'), 0);
    const weeklyEarnings = weeklyDeliveries.reduce((sum, delivery) => 
      sum + parseFloat(delivery.deliveryFee || '0'), 0);

    return {
      todayEarnings,
      weeklyEarnings,
      totalEarnings: parseFloat(profile?.totalEarnings || '0'),
      completedDeliveries: profile?.totalDeliveries || 0
    };
  }

  async getDriverDeliveryHistory(userId: number): Promise<DeliveryRequest[]> {
    const history = await db.select({
      id: deliveryRequests.id,
      customerId: deliveryRequests.customerId,
      deliveryType: deliveryRequests.deliveryType,
      pickupAddress: deliveryRequests.pickupAddress,
      deliveryAddress: deliveryRequests.deliveryAddress,
      deliveryFee: deliveryRequests.deliveryFee,
      status: deliveryRequests.status,
      deliveredAt: deliveryRequests.deliveredAt,
      createdAt: deliveryRequests.createdAt,
      customer: {
        fullName: users.fullName,
        phone: users.phone
      }
    })
    .from(deliveryRequests)
    .leftJoin(users, eq(deliveryRequests.customerId, users.id))
    .where(eq(deliveryRequests.driverId, userId))
    .orderBy(desc(deliveryRequests.deliveredAt))
    .limit(50);

    return history;
  }

  // Merchant operations implementation
  async getMerchantProfile(userId: number): Promise<MerchantProfile | undefined> {
    const [profile] = await db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, userId));
    return profile || undefined;
  }

  async createMerchantProfile(profile: InsertMerchantProfile): Promise<MerchantProfile> {
    const [newProfile] = await db.insert(merchantProfiles).values(profile).returning();
    return newProfile;
  }

  async getMerchantDashboardStats(userId: number): Promise<{ todayRevenue: number; ordersCount: number; productViews: number; unreadMessages: number }> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Get today's orders and revenue
    const todayOrders = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, userId),
          gte(orders.createdAt, startOfDay)
        )
      );

    const todayRevenue = todayOrders.reduce((sum, order) => 
      sum + parseFloat(order.totalPrice || '0'), 0);

    // Get pending orders count
    const pendingOrders = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, userId),
          eq(orders.status, 'pending')
        )
      );

    // Mock data for product views and messages (would need additional tracking tables)
    return {
      todayRevenue,
      ordersCount: pendingOrders.length,
      productViews: Math.floor(Math.random() * 1000) + 500, // Mock data
      unreadMessages: Math.floor(Math.random() * 10) + 1 // Mock data
    };
  }

  async getMerchantOrders(userId: number): Promise<Order[]> {
    const merchantOrders = await db.select({
      id: orders.id,
      buyerId: orders.buyerId,
      sellerId: orders.sellerId,
      productId: orders.productId,
      quantity: orders.quantity,
      totalPrice: orders.totalPrice,
      status: orders.status,
      deliveryAddress: orders.deliveryAddress,
      driverId: orders.driverId,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      buyer: {
        fullName: users.fullName,
        phone: users.phone,
        email: users.email
      },
      product: {
        name: products.name,
        price: products.price,
        unit: products.unit,
        image: products.image
      }
    })
    .from(orders)
    .leftJoin(users, eq(orders.buyerId, users.id))
    .leftJoin(products, eq(orders.productId, products.id))
    .where(eq(orders.sellerId, userId))
    .orderBy(desc(orders.createdAt));

    return merchantOrders;
  }

  async updateOrderStatus(orderId: string, status: string, merchantId: number): Promise<void> {
    await db.update(orders)
      .set({ 
        status: status as any,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.sellerId, merchantId)
        )
      );
  }

  async getMerchantAnalytics(userId: number, period: string): Promise<MerchantAnalytics[]> {
    let daysBack = 7;
    if (period === '30d') daysBack = 30;
    if (period === '90d') daysBack = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const analytics = await db.select()
      .from(merchantAnalytics)
      .where(
        and(
          eq(merchantAnalytics.merchantId, userId),
          gte(merchantAnalytics.date, startDate)
        )
      )
      .orderBy(desc(merchantAnalytics.date));

    return analytics;
  }

  async createDeliveryRequest(request: InsertDeliveryRequest): Promise<DeliveryRequest> {
    const [newRequest] = await db.insert(deliveryRequests).values(request).returning();
    return newRequest;
  }

  // Support Ticket operations implementation
  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [newTicket] = await db.insert(supportTickets).values({
      ...ticket,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newTicket;
  }

  async getSupportTickets(filters?: { status?: string; priority?: string; userRole?: string }): Promise<SupportTicket[]> {
    let query = db.select().from(supportTickets);

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(supportTickets.status, filters.status as any));
    }
    if (filters?.priority) {
      conditions.push(eq(supportTickets.priority, filters.priority as any));
    }
    if (filters?.userRole) {
      conditions.push(eq(supportTickets.userRole, filters.userRole as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
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
      .set({ 
        ...updateData, 
        updatedAt: new Date(),
        ...(updateData.status === 'RESOLVED' && { resolvedAt: new Date() })
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return updatedTicket;
  }

  // Identity verification methods
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
      .where(and(
        eq(phoneVerifications.userId, userId),
        eq(phoneVerifications.otpCode, otpCode),
        eq(phoneVerifications.isVerified, false),
        gte(phoneVerifications.expiresAt, new Date())
      ));

    if (verification) {
      await db
        .update(phoneVerifications)
        .set({ isVerified: true })
        .where(eq(phoneVerifications.id, verification.id));
      return verification;
    }
    return null;
  }

  async updateUser(userId: number, data: any): Promise<any> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createSocialUser(userData: any) {
    const userId = await this.generateUserId();
    const [user] = await db
      .insert(users)
      .values({
        userId,
        fullName: userData.fullName,
        email: userData.email,
        phone: '', // Will be updated later
        password: '', // Social login users don't need passwords
        role: 'CONSUMER', // Default role for social login
        isVerified: userData.isVerified || true, // Social accounts are auto-verified
        socialProvider: userData.socialProvider,
        socialId: userData.socialId,
        profilePicture: userData.profilePicture,
      })
      .returning();

    return user;
  }

  async linkSocialAccount(userId: number, provider: string, socialId: string, profilePicture?: string) {
    const updateData: any = {
      socialProvider: provider,
      socialId: socialId,
      updatedAt: new Date()
    };

    if (profilePicture) {
      updateData.profilePicture = profilePicture;
    }

    const [result] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return result;
  }

  async updateUserProfilePicture(userId: number, profilePicture: string) {
    const [result] = await db.update(users)
      .set({ 
        profilePicture,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    return result;
  }

  async storePushSubscription(userId: number, subscription: any) {
    // Store push subscription in database
    // This would typically be a separate table for push subscriptions
    const [result] = await db.update(users)
      .set({ 
        pushSubscription: JSON.stringify(subscription),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    return result;
  }

  async removePushSubscription(userId: number) {
    const [result] = await db.update(users)
      .set({ 
        pushSubscription: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    return result;
  }

  // Fuel order methods
  async getNearbyFuelStations(latitude: number, longitude: number, radius: number): Promise<any> {
    // Mock data for now - in a real app this would query a fuel stations database
    return [
      {
        id: 'station-1',
        name: 'Total Energies Wuse II',
        brand: 'Total Energies',
        address: 'Plot 123, Ademola Adetokunbo Crescent, Wuse II',
        latitude: latitude + 0.01,
        longitude: longitude + 0.01,
        distance: 2.3,
        rating: 4.5,
        reviewCount: 128,
        prices: {
          PMS: 617,
          AGO: 620,
          DPK: 615
        },
        fuelTypes: ['PMS', 'AGO', 'DPK'],
        isOpen: true,
        deliveryTime: '15-25 mins',
        phone: '+234 803 123 4567'
      },
      {
        id: 'station-2',
        name: 'Mobil Goldcourt',
        brand: 'Mobil',
        address: 'Goldcourt Estate, Life Camp',
        latitude: latitude + 0.02,
        longitude: longitude - 0.01,
        distance: 3.1,
        rating: 4.2,
        reviewCount: 89,
        prices: {
          PMS: 615,
          AGO: 618,
          DPK: 613
        },
        fuelTypes: ['PMS', 'AGO'],
        isOpen: true,
        deliveryTime: '20-30 mins',
        phone: '+234 805 987 6543'
      }
    ];
  }

  async createFuelOrder(data: any): Promise<any> {
    try {
      // In a real app, this would insert into a fuel_orders table
      const orderId = `FO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const order = {
        id: orderId,
        ...data,
        customerId: data.userId, // Ensure customerId is set correctly
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in memory for now (in production, use database)
      if (!this.fuelOrders) this.fuelOrders = new Map();
      this.fuelOrders.set(orderId, order);

      return order;
    } catch (error) {
      console.error("Error creating fuel order:", error);
      throw error;
    }
  }

  async getFuelOrders(userId: number): Promise<any> {
    try {
      // Mock data - in real app would query database
      return Array.from(this.fuelOrders?.values() || [])
        .filter(order => order.customerId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error fetching fuel orders:", error);
      throw error;
    }
  }

  async updateFuelOrderStatus(orderId: string, status: string, driverId?: number): Promise<any> {
    try {
      if (!this.fuelOrders) this.fuelOrders = new Map();

      const order = this.fuelOrders.get(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const updatedOrder = {
        ...order,
        status,
        driverId,
        updatedAt: new Date()
      };

      this.fuelOrders.set(orderId, updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error("Error updating fuel order status:", error);
      throw error;
    }
  }

  async getAvailableFuelOrders(): Promise<any> {
    try {
      return Array.from(this.fuelOrders?.values() || [])
        .filter(order => order.status === 'PENDING')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (error) {
      console.error("Error fetching available fuel orders:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();