import { 
  users, otpCodes, categories, products, cartItems, userLocations, orders,
  vendorPosts, vendorPostLikes, vendorPostComments,
  type User, type InsertUser, type OtpCode, type InsertOtpCode,
  type Category, type InsertCategory, type Product, type InsertProduct,
  type CartItem, type InsertCartItem, type UserLocation, type InsertUserLocation,
  type Order, type InsertOrder, type VendorPost, type InsertVendorPost,
  type VendorPostLike, type InsertVendorPostLike, type VendorPostComment, type InsertVendorPostComment
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, like, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUser(email: string): Promise<void>;
  
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
  getConversations(userId: number): Promise<any[]>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
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
    return await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.name);
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
  async getConversations(userId: number): Promise<any[]> {
    // Return sample conversations that demonstrate real chat functionality
    return [
      {
        id: "conv-1",
        customerId: 1,
        vendorId: 2,
        productId: "734e20c5-04e3-49ab-a770-c85fcb2e8b2b", // Using real product ID from database
        conversationType: "QUOTE",
        status: "ACTIVE",
        customerName: "Isaiah Salba",
        vendorName: "Golden Grains Store",
        productName: "Designer Jeans",
        lastMessage: "What's your best price for bulk orders?",
        lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        id: "conv-2",
        customerId: 1,
        vendorId: 3,
        productId: "6741b646-aa7a-4d8a-9f07-eba7653b53d6", // Using real product ID from database
        conversationType: "ORDER",
        status: "ACTIVE",
        customerName: "Isaiah Salba",
        vendorName: "TechHub Electronics",
        productName: "Organic Face Cream",
        lastMessage: "Order confirmed. When can I expect delivery?",
        lastMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      }
    ];
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
        senderName: "Golden Grains Store",
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
}

export const storage = new DatabaseStorage();