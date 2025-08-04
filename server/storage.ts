import { 
  users, otpCodes, categories, products, cartItems, userLocations, orders,
  vendorPosts, vendorPostLikes, vendorPostComments, conversations, chatMessages,
  driverProfiles, merchantProfiles, merchantAnalytics, supportTickets,
  type User, type InsertUser, type OtpCode, type InsertOtpCode,
  type Category, type InsertCategory, type Product, type InsertProduct,
  type CartItem, type InsertCartItem, type UserLocation, type InsertUserLocation,
  type Order, type InsertOrder,
  type Conversation, type InsertConversation, type ChatMessage, type InsertChatMessage,
  type DriverProfile, type InsertDriverProfile, type MerchantProfile, type InsertMerchantProfile,
  type MerchantAnalytics, type InsertMerchantAnalytics,
  type SupportTicket, type InsertSupportTicket
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, like, desc, sql, or, ne, gt, lt, lte, inArray, isNull, isNotNull } from "drizzle-orm";

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

  // Support Ticket operations
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTickets(filters?: { status?: string; priority?: string; userRole?: string }): Promise<SupportTicket[]>;
  getSupportTicket(ticketId: string): Promise<SupportTicket | undefined>;
  updateSupportTicket(ticketId: string, updateData: Partial<SupportTicket>): Promise<SupportTicket>;
  
  // Basic method stubs for fuel orders and tracking (to be implemented)
  getNearbyFuelStations(lat: number, lng: number, radius: number): Promise<any[]>;
  createFuelOrder(orderData: any): Promise<any>;
  getFuelOrders(userId: number): Promise<any[]>;
  getFuelOrderById(orderId: string): Promise<any | null>;
  getOrderTracking(orderId: string): Promise<any | null>;
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

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  // Product operations
  async getProducts(filters: { categoryId?: number; search?: string; limit?: number; offset?: number }): Promise<Product[]> {
    let query = db.select().from(products);

    const conditions: any[] = [];
    
    if (filters.categoryId) {
      conditions.push(eq(products.categoryId, filters.categoryId));
    }
    
    if (filters.search) {
      conditions.push(
        or(
          like(products.name, `%${filters.search}%`),
          like(products.description, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(products.createdAt));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  // Cart operations
  async getCartItems(userId: number): Promise<CartItem[]> {
    return await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.userId, userId))
      .orderBy(desc(cartItems.createdAt));
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    const [cartItem] = await db
      .insert(cartItems)
      .values(insertCartItem)
      .returning();
    return cartItem;
  }

  async updateCartItem(cartItemId: number, quantity: number): Promise<CartItem> {
    const [cartItem] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, cartItemId))
      .returning();
    return cartItem;
  }

  async removeFromCart(cartItemId: number): Promise<void> {
    await db
      .delete(cartItems)
      .where(eq(cartItems.id, cartItemId));
  }

  // Support Ticket operations
  async createSupportTicket(insertTicket: InsertSupportTicket): Promise<SupportTicket> {
    const [ticket] = await db
      .insert(supportTickets)
      .values(insertTicket)
      .returning();
    return ticket;
  }

  async getSupportTickets(filters?: { status?: string; priority?: string; userRole?: string }): Promise<SupportTicket[]> {
    let query = db.select().from(supportTickets);

    const conditions: any[] = [];
    
    if (filters?.status) {
      conditions.push(eq(supportTickets.status, filters.status as any));
    }
    
    if (filters?.priority) {
      conditions.push(eq(supportTickets.priority, filters.priority as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(ticketId: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId));
    return ticket || undefined;
  }

  async updateSupportTicket(ticketId: string, updateData: Partial<SupportTicket>): Promise<SupportTicket> {
    const [ticket] = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return ticket;
  }

  // Basic method stubs for fuel orders and tracking
  async getNearbyFuelStations(lat: number, lng: number, radius: number): Promise<any[]> {
    // Stub implementation
    return [];
  }

  async createFuelOrder(orderData: any): Promise<any> {
    // Stub implementation
    return { id: 'temp-id', ...orderData };
  }

  async getFuelOrders(userId: number): Promise<any[]> {
    // Stub implementation
    return [];
  }

  async getFuelOrderById(orderId: string): Promise<any | null> {
    // Stub implementation
    return null;
  }

  async getOrderTracking(orderId: string): Promise<any | null> {
    // Stub implementation
    return null;
  }
}

export const storage = new DatabaseStorage();