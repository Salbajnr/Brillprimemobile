import { 
  users, otpCodes, categories, products, cartItems, userLocations, orders,
  vendorPosts, vendorPostLikes, vendorPostComments, conversations, chatMessages,
  driverProfiles, merchantProfiles, merchantAnalytics, supportTickets, fuelOrders,
  type User, type InsertUser, type OtpCode, type InsertOtpCode,
  type Category, type InsertCategory, type Product, type InsertProduct,
  type CartItem, type InsertCartItem, type UserLocation, type InsertUserLocation,
  type Order, type InsertOrder, type FuelOrder, type InsertFuelOrder,
  type Conversation, type InsertConversation, type ChatMessage, type InsertChatMessage,
  type DriverProfile, type InsertDriverProfile, type MerchantProfile, type InsertMerchantProfile,
  type MerchantAnalytics, type InsertMerchantAnalytics,
  type SupportTicket, type InsertSupportTicket
} from "@shared/schema";
import { desc, eq, and, isNull, ne, sql, count, sum, avg, gte, like, or, gt, lt, lte, inArray, isNotNull } from "drizzle-orm";
import { db } from "./db";

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
  
  // Fuel Orders and Tracking operations
  getNearbyFuelStations(lat: number, lng: number, radius: number): Promise<any[]>;
  createFuelOrder(orderData: any): Promise<any>;
  getFuelOrders(userId: number): Promise<any[]>;
  getFuelOrderById(orderId: string): Promise<any | null>;
  getOrderTracking(orderId: string): Promise<any | null>;
  
  // Driver Management operations
  getAvailableDrivers(lat: number, lng: number, radius?: number): Promise<any[]>;
  assignDriverToOrder(orderId: string, driverId: number): Promise<any>;
  updateDriverLocation(driverId: number, latitude: number, longitude: number): Promise<void>;
  
  // Real-time Analytics operations
  getSystemMetrics(): Promise<any>;
  getUserActivityMetrics(timeframe?: string): Promise<any>;
  getTransactionMetrics(timeframe?: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  private db = db;
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserBySocialId(socialProvider: string, socialId: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users)
      .where(and(eq(users.socialProvider, socialProvider), eq(users.socialId, socialId)));
    return user || undefined;
  }

  async generateUserId(): Promise<string> {
    const [latestUser] = await this.db.select().from(users)
      .orderBy(desc(users.id))
      .limit(1);

    const nextNumber = latestUser ? latestUser.id + 1 : 1;
    return `BP-${nextNumber.toString().padStart(6, '0')}`;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userId = await this.generateUserId();
    const [user] = await this.db
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
    return await this.db.select().from(categories).orderBy(categories.name);
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

  // Fuel Station Operations
  async getNearbyFuelStations(lat: number, lng: number, radius: number): Promise<any[]> {
    // In a real implementation, this would query a fuel stations database
    // For now, return realistic static data based on location
    const stations = [
      {
        id: 'station_001',
        name: 'Total Energies Victoria Island',
        address: '1391 Tiamiyu Savage St, Victoria Island, Lagos',
        latitude: 6.4267,
        longitude: 3.4200,
        distance: this.calculateDistance(lat, lng, 6.4267, 3.4200),
        fuelTypes: ['PMS', 'AGO', 'DPK'],
        prices: { PMS: 617, AGO: 890, DPK: 750 },
        isOpen: true,
        rating: 4.2
      },
      {
        id: 'station_002', 
        name: 'Mobil Lekki Phase 1',
        address: 'Admiralty Way, Lekki Phase 1, Lagos',
        latitude: 6.4500,
        longitude: 3.4700,
        distance: this.calculateDistance(lat, lng, 6.4500, 3.4700),
        fuelTypes: ['PMS', 'AGO'],
        prices: { PMS: 615, AGO: 885 },
        isOpen: true,
        rating: 4.5
      },
      {
        id: 'station_003',
        name: 'Shell Ikeja GRA',
        address: 'Obafemi Awolowo Way, Ikeja GRA, Lagos',
        latitude: 6.5895,
        longitude: 3.3619,
        distance: this.calculateDistance(lat, lng, 6.5895, 3.3619),
        fuelTypes: ['PMS', 'AGO', 'DPK'],
        prices: { PMS: 620, AGO: 895, DPK: 755 },
        isOpen: true,
        rating: 4.0
      }
    ];

    return stations
      .filter(station => station.distance <= radius / 1000)
      .sort((a, b) => a.distance - b.distance);
  }

  async createFuelOrder(orderData: any): Promise<any> {
    const newOrder = await this.db
      .insert(fuelOrders)
      .values({
        customerId: orderData.customerId,
        stationId: orderData.stationId,
        fuelType: orderData.fuelType,
        quantity: orderData.quantity.toString(),
        unitPrice: orderData.unitPrice.toString(),
        totalAmount: orderData.totalAmount.toString(),
        deliveryAddress: orderData.deliveryAddress,
        deliveryLatitude: orderData.deliveryLatitude.toString(),
        deliveryLongitude: orderData.deliveryLongitude.toString(),
        notes: orderData.notes,
        scheduledDeliveryTime: orderData.scheduledDeliveryTime ? new Date(orderData.scheduledDeliveryTime) : null
      })
      .returning();

    return newOrder[0];
  }

  async getFuelOrders(userId: number): Promise<any[]> {
    const orders = await this.db
      .select({
        id: fuelOrders.id,
        stationId: fuelOrders.stationId,
        fuelType: fuelOrders.fuelType,
        quantity: fuelOrders.quantity,
        unitPrice: fuelOrders.unitPrice,
        totalAmount: fuelOrders.totalAmount,
        deliveryAddress: fuelOrders.deliveryAddress,
        status: fuelOrders.status,
        createdAt: fuelOrders.createdAt,
        estimatedDeliveryTime: fuelOrders.estimatedDeliveryTime,
        notes: fuelOrders.notes,
        driverName: users.fullName,
        driverPhone: users.phone
      })
      .from(fuelOrders)
      .leftJoin(users, eq(fuelOrders.driverId, users.id))
      .where(eq(fuelOrders.customerId, userId))
      .orderBy(desc(fuelOrders.createdAt));

    return orders;
  }

  async getFuelOrderById(orderId: string): Promise<any | null> {
    const order = await this.db
      .select({
        id: fuelOrders.id,
        customerId: fuelOrders.customerId,
        driverId: fuelOrders.driverId,
        stationId: fuelOrders.stationId,
        fuelType: fuelOrders.fuelType,
        quantity: fuelOrders.quantity,
        unitPrice: fuelOrders.unitPrice,
        totalAmount: fuelOrders.totalAmount,
        deliveryAddress: fuelOrders.deliveryAddress,
        deliveryLatitude: fuelOrders.deliveryLatitude,
        deliveryLongitude: fuelOrders.deliveryLongitude,
        status: fuelOrders.status,
        createdAt: fuelOrders.createdAt,
        estimatedDeliveryTime: fuelOrders.estimatedDeliveryTime,
        notes: fuelOrders.notes,
        customerName: users.fullName,
        customerPhone: users.phone
      })
      .from(fuelOrders)
      .leftJoin(users, eq(fuelOrders.customerId, users.id))
      .where(eq(fuelOrders.id, orderId))
      .limit(1);

    return order[0] || null;
  }

  async getOrderTracking(orderId: string): Promise<any | null> {
    // Check if it's a fuel order
    const fuelOrder = await this.getFuelOrderById(orderId);
    if (fuelOrder) {
      return {
        orderId: fuelOrder.id,
        buyerId: fuelOrder.customerId,
        sellerId: null, // Fuel orders don't have sellers
        driverId: fuelOrder.driverId,
        status: fuelOrder.status,
        deliveryAddress: fuelOrder.deliveryAddress,
        pickupAddress: `Station: ${fuelOrder.stationId}`,
        merchantContact: null
      };
    }

    // Check if it's a regular order
    const regularOrder = await this.db
      .select({
        id: orders.id,
        buyerId: orders.buyerId,
        sellerId: orders.sellerId,
        driverId: orders.driverId,
        status: orders.status,
        deliveryAddress: orders.deliveryAddress
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (regularOrder[0]) {
      return {
        orderId: regularOrder[0].id,
        buyerId: regularOrder[0].buyerId,
        sellerId: regularOrder[0].sellerId,
        driverId: regularOrder[0].driverId,
        status: regularOrder[0].status,
        deliveryAddress: regularOrder[0].deliveryAddress,
        pickupAddress: 'Merchant Location',
        merchantContact: 'Available in app'
      };
    }

    return null;
  }

  // Driver Management Operations
  async getAvailableDrivers(lat: number, lng: number, radius: number = 20): Promise<any[]> {
    const drivers = await this.db
      .select({
        driverId: users.id,
        fullName: users.fullName,
        phone: users.phone,
        profilePicture: users.profilePicture,
        vehicleType: driverProfiles.vehicleType,
        vehiclePlate: driverProfiles.vehiclePlate,
        rating: driverProfiles.rating,
        totalDeliveries: driverProfiles.totalDeliveries,
        isAvailable: driverProfiles.isAvailable,
        currentLocation: driverProfiles.currentLocation
      })
      .from(users)
      .innerJoin(driverProfiles, eq(users.id, driverProfiles.userId))
      .where(
        and(
          eq(users.role, 'DRIVER'),
          eq(driverProfiles.isAvailable, true),
          eq(driverProfiles.isActive, true)
        )
      );

    // Filter by distance and calculate actual distance
    return drivers
      .filter((driver: any) => {
        if (!driver.currentLocation) return false;
        const driverLat = driver.currentLocation.latitude;
        const driverLng = driver.currentLocation.longitude;
        if (!driverLat || !driverLng) return false;
        
        const distance = this.calculateDistance(lat, lng, driverLat, driverLng);
        return distance <= radius;
      })
      .map((driver: any) => ({
        ...driver,
        distance: driver.currentLocation ? 
          this.calculateDistance(lat, lng, driver.currentLocation.latitude, driver.currentLocation.longitude) : 
          null
      }))
      .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
  }

  async assignDriverToOrder(orderId: string, driverId: number): Promise<any> {
    // Check if it's a fuel order
    const fuelOrder = await this.db
      .select({ id: fuelOrders.id })
      .from(fuelOrders)
      .where(eq(fuelOrders.id, orderId))
      .limit(1);

    if (fuelOrder[0]) {
      const updated = await this.db
        .update(fuelOrders)
        .set({ 
          driverId, 
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000) // 45 minutes from now
        })
        .where(eq(fuelOrders.id, orderId))
        .returning();

      // Update driver availability
      await this.db
        .update(driverProfiles)
        .set({ isAvailable: false })
        .where(eq(driverProfiles.userId, driverId));

      return updated[0];
    }

    // Handle regular orders
    const updated = await this.db
      .update(orders)
      .set({ driverId, status: 'confirmed' })
      .where(eq(orders.id, orderId))
      .returning();

    if (updated[0]) {
      await this.db
        .update(driverProfiles)
        .set({ isAvailable: false })
        .where(eq(driverProfiles.userId, driverId));
    }

    return updated[0];
  }

  async updateDriverLocation(driverId: number, latitude: number, longitude: number): Promise<void> {
    await this.db
      .update(driverProfiles)
      .set({ 
        currentLocation: { latitude, longitude },
      })
      .where(eq(driverProfiles.userId, driverId));

    // Also update user location table for history
    await this.db
      .insert(userLocations)
      .values({
        userId: driverId,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        isActive: true
      })
;
  }

  // Real-time Analytics Operations
  async getSystemMetrics(): Promise<any> {
    const [userStats, orderStats, transactionStats] = await Promise.all([
      this.db.select({ count: count() }).from(users),
      this.db.select({ count: count() }).from(orders),
      this.db.select({ 
        count: count(),
        total: sum(sql`CAST(${orders.totalPrice} AS DECIMAL)`)
      }).from(orders).where(eq(orders.status, 'delivered'))
    ]);

    const onlineDrivers = await this.db
      .select({ count: count() })
      .from(driverProfiles)
      .where(
        and(
          eq(driverProfiles.isAvailable, true),
          eq(driverProfiles.isActive, true)
        )
      );

    return {
      totalUsers: userStats[0]?.count || 0,
      totalOrders: orderStats[0]?.count || 0,
      completedOrders: transactionStats[0]?.count || 0,
      totalRevenue: transactionStats[0]?.total || 0,
      onlineDrivers: onlineDrivers[0]?.count || 0,
      timestamp: Date.now()
    };
  }

  async getUserActivityMetrics(timeframe: string = '24h'): Promise<any> {
    const timeAgo = this.getTimeAgo(timeframe);
    
    const [newUsers, activeUsers] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.createdAt} >= ${timeAgo}`),
      
      this.db
        .select({ count: count() })
        .from(userLocations)
        .where(sql`${userLocations.updatedAt} >= ${timeAgo}`)
    ]);

    return {
      newUsers: newUsers[0]?.count || 0,
      activeUsers: activeUsers[0]?.count || 0,
      timeframe,
      timestamp: Date.now()
    };
  }

  async getTransactionMetrics(timeframe: string = '24h'): Promise<any> {
    const timeAgo = this.getTimeAgo(timeframe);
    
    const [recentOrders, recentFuelOrders] = await Promise.all([
      this.db
        .select({ 
          count: count(),
          total: sum(sql`CAST(${orders.totalPrice} AS DECIMAL)`)
        })
        .from(orders)
        .where(sql`${orders.createdAt} >= ${timeAgo}`),
      
      this.db
        .select({ 
          count: count(),
          total: sum(sql`CAST(${fuelOrders.totalAmount} AS DECIMAL)`)
        })
        .from(fuelOrders)
        .where(sql`${fuelOrders.createdAt} >= ${timeAgo}`)
    ]);

    return {
      totalTransactions: (recentOrders[0]?.count || 0) + (recentFuelOrders[0]?.count || 0),
      totalVolume: (parseFloat(recentOrders[0]?.total?.toString() || '0')) + 
                   (parseFloat(recentFuelOrders[0]?.total?.toString() || '0')),
      regularOrders: recentOrders[0]?.count || 0,
      fuelOrders: recentFuelOrders[0]?.count || 0,
      timeframe,
      timestamp: Date.now()
    };
  }

  private getTimeAgo(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 1 * 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  // Add missing method for wallet operations
  async getUserWallet(userId: number): Promise<any> {
    const wallet = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return wallet[0] || null;
  }

  // Send message for live chat
  async sendMessage(data: {
    conversationId: string;
    senderId: number;
    content: string;
    messageType: string;
  }): Promise<any> {
    // This would insert into a messages table in a real implementation
    // For now, return a mock message structure
    return {
      id: Date.now(),
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content,
      messageType: data.messageType,
      timestamp: new Date(),
      isRead: false
    };
  }
}

export const storage = new DatabaseStorage();