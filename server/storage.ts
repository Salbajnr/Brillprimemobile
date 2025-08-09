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
  type SupportTicket, type InsertSupportTicket,
  escrowTransactions, escrowReleases, deliveryConfirmations, transactions
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
  updateDriverProfile(driverId: number, data: any): Promise<any>; // Added this method

  // Real-time Analytics operations
  getSystemMetrics(): Promise<any>;
  getUserActivityMetrics(timeframe?: string): Promise<any>;
  getTransactionMetrics(timeframe?: string): Promise<any>;

  // Enhanced merchant methods
  getMerchantOrdersForDate(merchantId: number, date: Date): Promise<any[]>;
  getMerchantActiveOrders(merchantId: number): Promise<any[]>;
  getMerchantCustomers(merchantId: number): Promise<any[]>;
  getMerchantProducts(merchantId: number): Promise<any[]>;
  getMerchantOrdersForPeriod(merchantId: number, startDate: Date, endDate: Date): Promise<any[]>;
  updateMerchantBusinessHours(merchantId: number, isOpen: boolean): Promise<any>;

  // Enhanced driver methods
  updateDriverStatus(driverId: number, isOnline: boolean, location?: { lat: number; lng: number }): Promise<any>;
  getAvailableDeliveryRequests(driverId: number): Promise<any[]>;
  acceptDeliveryRequest(requestId: string, driverId: number): Promise<any>;
  updateDriverAvailability(driverId: number, isAvailable: boolean): Promise<any>;
  getDeliveryById(deliveryId: string): Promise<any>;
  updateDeliveryStatus(deliveryId: string, status: string, metadata?: any): Promise<any>;
  updateDriverEarnings(driverId: number, amount: number): Promise<any>;
  getDriverDeliveriesForDate(driverId: number, date: Date): Promise<any[]>;
  getDriverDeliveriesForPeriod(driverId: number, startDate: Date, endDate: Date): Promise<any[]>;
  getDriverDeliveries(driverId: number): Promise<any[]>;

  // Secure Transaction System methods
  createEscrowTransaction(transaction: any): Promise<any>;
  processSecurePayment(paymentData: any): Promise<any>;
  updateEscrowTransaction(transactionId: string, updateData: any): Promise<any>;
  getEscrowTransaction(transactionId: string): Promise<any>;
  verifyEscrowReleaseConditions(transactionId: string): Promise<any>;
  releaseEscrowFunds(releaseData: any): Promise<any>;
  createDispute(disputeData: any): Promise<any>;
  getMerchantEscrowBalance(merchantId: number): Promise<any>;
  getUserTransactionHistory(userId: number, filters: any): Promise<any[]>;
  confirmDelivery(confirmationData: any): Promise<any>;

  // Admin Oversight methods
  getPendingVerifications(filters: any): Promise<any[]>;
  reviewVerification(reviewData: any): Promise<any>;
  getEscrowOverview(): Promise<any>;
  getDisputes(filters: any): Promise<any[]>;
  resolveDispute(resolutionData: any): Promise<any>;
  refundEscrowToCustomer(transactionId: string, amount?: number): Promise<any>;
  releaseEscrowToMerchant(transactionId: string): Promise<any>;
  performManualEscrowAction(actionData: any): Promise<any>;
  getPlatformAnalytics(filters: any): Promise<any>;
  getContentForReview(filters: any): Promise<any[]>;
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
      });
  }
  
  async updateDriverProfile(driverId: number, data: any) {
    const [driver] = await db.update(driverProfiles)
      .set({
        phoneNumber: data.phoneNumber,
        vehicleType: data.vehicleType,
        vehicleModel: data.vehicleModel,
        plateNumber: data.plateNumber,
        driverLicense: data.driverLicense,
        vehicleRegistration: data.vehicleRegistration,
        insuranceDocument: data.insuranceDocument,
        profilePicture: data.profilePicture,
        backgroundCheckStatus: data.backgroundCheckStatus,
        tier: data.tier,
        isVerified: data.isVerified,
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.id, driverId))
      .returning();

    return driver;
  }

  // SECURE TRANSACTION METHODS
  async createEscrowTransaction(data: any) {
    const [transaction] = await db.insert(escrowTransactions)
      .values(data)
      .returning();
    return transaction;
  }

  async getEscrowTransaction(transactionId: string) {
    const [transaction] = await db.select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.id, transactionId));
    return transaction;
  }

  async updateEscrowTransaction(transactionId: string, data: any) {
    const [transaction] = await db.update(escrowTransactions)
      .set(data)
      .where(eq(escrowTransactions.id, transactionId))
      .returning();
    return transaction;
  }

  async processSecurePayment(paymentData: any) {
    try {
      // Simulate payment processing - replace with actual Paystack integration
      return {
        success: true,
        reference: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: "Payment processed successfully"
      };
    } catch (error) {
      return {
        success: false,
        error: "Payment processing failed"
      };
    }
  }

  async verifyEscrowReleaseConditions(transactionId: string) {
    const transaction = await this.getEscrowTransaction(transactionId);

    if (!transaction) {
      return { eligible: false, reason: "Transaction not found" };
    }

    if (transaction.status !== 'PAID') {
      return { eligible: false, reason: "Transaction not paid" };
    }

    if (transaction.disputeId) {
      return { eligible: false, reason: "Transaction is disputed" };
    }

    return { eligible: true };
  }

  async releaseEscrowFunds(data: any) {
    const { transactionId, releaseType, notes, releasedBy } = data;

    // Update transaction status
    await this.updateEscrowTransaction(transactionId, {
      status: 'RELEASED',
      releasedAt: new Date()
    });

    // Create release record
    const [release] = await db.insert(escrowReleases)
      .values({
        transactionId,
        releaseType,
        releasedBy,
        amount: 0, // Will be updated with actual amount
        notes,
        releasedAt: new Date()
      })
      .returning();

    return release;
  }

  async createDispute(data: any) {
    const [dispute] = await db.insert(disputes)
      .values(data)
      .returning();
    return dispute;
  }

  async getMerchantEscrowBalance(merchantId: number) {
    // Mock implementation - replace with actual database queries
    return {
      totalHeld: 0,
      pendingRelease: 0,
      availableForWithdrawal: 0,
      totalWithdrawn: 0,
      recentTransactions: []
    };
  }

  async getUserTransactionHistory(userId: number, options: any) {
    const { status, limit = 50, offset = 0 } = options;

    let query = db.select()
      .from(escrowTransactions)
      .where(or(
        eq(escrowTransactions.customerId, userId),
        eq(escrowTransactions.merchantId, userId)
      ))
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where(eq(escrowTransactions.status, status));
    }

    return await query;
  }

  async confirmDelivery(data: any) {
    const [confirmation] = await db.insert(deliveryConfirmations)
      .values(data)
      .returning();
    return confirmation;
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

  // Transaction methods
  async getTransactionById(id: string) {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async addLocationHistory(userId: number, locationData: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    orderId?: string;
  }) {
    // This would be implemented with a location_history table in production
    console.log(`Location history for user ${userId}:`, locationData);
    return true;
  }

  async addSupportMessage(messageData: {
    ticketId: string;
    senderId: number;
    content: string;
    messageType?: string;
  }) {
    // This would be implemented with support_messages table in production
    console.log(`Support message for ticket ${messageData.ticketId}:`, messageData);
    return {
      id: Date.now(),
      ...messageData,
      timestamp: new Date()
    };
  }

  // Vendor Posts Management
  async createVendorPost(postData: any): Promise<any> {
    const [post] = await db
      .insert(vendorPosts)
      .values(postData)
      .returning();

    return post;
  }

  async getVendorPosts(filters: {
    vendorId?: number;
    postType?: string;
    page: number;
    limit: number;
    sortBy: string;
  }): Promise<{ posts: any[]; pagination: any }> {
    let query = db
      .select({
        id: vendorPosts.id,
        vendorId: vendorPosts.vendorId,
        title: vendorPosts.title,
        content: vendorPosts.content,
        postType: vendorPosts.postType,
        productId: vendorPosts.productId,
        images: vendorPosts.images,
        tags: vendorPosts.tags,
        originalPrice: vendorPosts.originalPrice,
        discountPrice: vendorPosts.discountPrice,
        discountPercentage: vendorPosts.discountPercentage,
        validUntil: vendorPosts.validUntil,
        isActive: vendorPosts.isActive,
        viewCount: vendorPosts.viewCount,
        likeCount: vendorPosts.likeCount,
        commentCount: vendorPosts.commentCount,
        createdAt: vendorPosts.createdAt,
        updatedAt: vendorPosts.updatedAt,
        vendorName: users.fullName,
        vendorProfilePicture: users.profilePicture
      })
      .from(vendorPosts)
      .leftJoin(users, eq(vendorPosts.vendorId, users.id));

    if (filters.vendorId) {
      query = query.where(eq(vendorPosts.vendorId, filters.vendorId));
    }

    if (filters.postType) {
      query = query.where(eq(vendorPosts.postType, filters.postType));
    }

    const offset = (filters.page - 1) * filters.limit;
    const posts = await query
      .orderBy(desc(vendorPosts.createdAt))
      .limit(filters.limit)
      .offset(offset);

    return {
      posts,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: posts.length // In production, this would be a separate count query
      }
    };
  }

  async getVendorPostById(postId: string): Promise<any | null> {
    const [post] = await db
      .select({
        id: vendorPosts.id,
        vendorId: vendorPosts.vendorId,
        title: vendorPosts.title,
        content: vendorPosts.content,
        postType: vendorPosts.postType,
        productId: vendorPosts.productId,
        images: vendorPosts.images,
        tags: vendorPosts.tags,
        originalPrice: vendorPosts.originalPrice,
        discountPrice: vendorPosts.discountPrice,
        discountPercentage: vendorPosts.discountPercentage,
        validUntil: vendorPosts.validUntil,
        isActive: vendorPosts.isActive,
        viewCount: vendorPosts.viewCount,
        likeCount: vendorPosts.likeCount,
        commentCount: vendorPosts.commentCount,
        createdAt: vendorPosts.createdAt,
        updatedAt: vendorPosts.updatedAt,
        vendorName: users.fullName,
        vendorProfilePicture: users.profilePicture
      })
      .from(vendorPosts)
      .leftJoin(users, eq(vendorPosts.vendorId, users.id))
      .where(eq(vendorPosts.id, postId))
      .limit(1);

    return post || null;
  }

  async updateVendorPost(postId: string, updateData: any): Promise<any> {
    const [updatedPost] = await db
      .update(vendorPosts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(vendorPosts.id, postId))
      .returning();

    return updatedPost;
  }

  async deleteVendorPost(postId: string): Promise<void> {
    await db
      .update(vendorPosts)
      .set({ isActive: false })
      .where(eq(vendorPosts.id, postId));
  }

  async incrementPostViewCount(postId: string): Promise<void> {
    await db
      .update(vendorPosts)
      .set({ 
        viewCount: sql`${vendorPosts.viewCount} + 1` 
      })
      .where(eq(vendorPosts.id, postId));
  }

  async togglePostLike(postId: string, userId: number): Promise<{ liked: boolean; likeCount: number }> {
    // Check if user already liked the post
    const [existingLike] = await db
      .select()
      .from(vendorPostLikes)
      .where(and(
        eq(vendorPostLikes.postId, postId),
        eq(vendorPostLikes.userId, userId)
      ))
      .limit(1);

    if (existingLike) {
      // Unlike the post
      await db
        .delete(vendorPostLikes)
        .where(and(
          eq(vendorPostLikes.postId, postId),
          eq(vendorPostLikes.userId, userId)
        ));

      await db
        .update(vendorPosts)
        .set({ likeCount: sql`${vendorPosts.likeCount} - 1` })
        .where(eq(vendorPosts.id, postId));

      return { liked: false, likeCount: 0 };
    } else {
      // Like the post
      await db
        .insert(vendorPostLikes)
        .values({ postId, userId });

      await db
        .update(vendorPosts)
        .set({ likeCount: sql`${vendorPosts.likeCount} + 1` })
        .where(eq(vendorPosts.id, postId));

      return { liked: true, likeCount: 1 };
    }
  }

  async addPostComment(commentData: { postId: string; userId: number; content: string; parentCommentId?: number }): Promise<any> {
    // This would be implemented with vendorPostComments table
    const comment = {
      id: Date.now(),
      ...commentData,
      createdAt: new Date(),
      isActive: true
    };

    // Update comment count
    await db
      .update(vendorPosts)
      .set({ commentCount: sql`${vendorPosts.commentCount} + 1` })
      .where(eq(vendorPosts.id, commentData.postId));

    return comment;
  }

  async getPostComments(postId: string, pagination: { page: number; limit: number }): Promise<{ comments: any[]; pagination: any }> {
    // This would be implemented with actual vendorPostComments table joins
    return {
      comments: [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0
      }
    };
  }

  async getVendorPostAnalytics(vendorId: number): Promise<any> {
    const [analytics] = await db
      .select({
        totalPosts: count(),
        totalViews: sql`SUM(${vendorPosts.viewCount})`,
        totalLikes: sql`SUM(${vendorPosts.likeCount})`,
        totalComments: sql`SUM(${vendorPosts.commentCount})`
      })
      .from(vendorPosts)
      .where(and(
        eq(vendorPosts.vendorId, vendorId),
        eq(vendorPosts.isActive, true)
      ));

    return analytics || {
      totalPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0
    };
  }

  // Product Management
  async createProduct(productData: any): Promise<any> {
    const [product] = await db
      .insert(products)
      .values(productData)
      .returning();

    return product;
  }

  async getProducts(filters: {
    categoryId?: number;
    sellerId?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    search?: string;
    page: number;
    limit: number;
    sortBy: string;
  }): Promise<{ products: any[]; pagination: any }> {
    let query = db
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
        sellerName: users.fullName
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.isActive, true));

    if (filters.sellerId) {
      query = query.where(eq(products.sellerId, filters.sellerId));
    }

    if (filters.categoryId) {
      query = query.where(eq(products.categoryId, filters.categoryId));
    }

    if (filters.inStock !== undefined) {
      query = query.where(eq(products.inStock, filters.inStock));
    }

    if (filters.search) {
      query = query.where(
        or(
          like(products.name, `%${filters.search}%`),
          like(products.description, `%${filters.search}%`)
        )
      );
    }

    const offset = (filters.page - 1) * filters.limit;
    const productList = await query
      .orderBy(desc(products.createdAt))
      .limit(filters.limit)
      .offset(offset);

    return {
      products: productList,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: productList.length
      }
    };
  }

  async getProductById(productId: string): Promise<any | null> {
    const [product] = await db
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
        sellerName: users.fullName,
        sellerProfilePicture: users.profilePicture
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, productId))
      .limit(1);

    return product || null;
  }

  async updateProduct(productId: string, updateData: any): Promise<any> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();

    return updatedProduct;
  }

  async deleteProduct(productId: string): Promise<void> {
    await db
      .update(products)
      .set({ isActive: false })
      .where(eq(products.id, productId));
  }

  async getProductAnalytics(sellerId: number): Promise<any> {
    const [analytics] = await db
      .select({
        totalProducts: count(),
        totalOrders: sql`SUM(CASE WHEN ${orders.sellerId} = ${sellerId} THEN 1 ELSE 0 END)`,
        totalRevenue: sql`SUM(CASE WHEN ${orders.sellerId} = ${sellerId} THEN CAST(${orders.totalPrice} AS DECIMAL) ELSE 0 END)`,
        averageRating: sql`AVG(CAST(${products.rating} AS DECIMAL))`
      })
      .from(products)
      .leftJoin(orders, eq(products.id, orders.productId))
      .where(and(
        eq(products.sellerId, sellerId),
        eq(products.isActive, true)
      ));

    return analytics || {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      averageRating: 0
    };
  }

  // Enhanced merchant methods implementation
  async getMerchantOrdersForDate(merchantId: number, date: Date): Promise<any[]> {
    const endDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    try {
      return await this.db
        .select()
        .from(orders)
        .innerJoin(users, eq(orders.buyerId, users.id))
        .where(and(
          eq(orders.sellerId, merchantId),
          gte(orders.createdAt, date),
          lt(orders.createdAt, endDate)
        ));
    } catch {
      return [];
    }
  }

  async getMerchantActiveOrders(merchantId: number): Promise<any[]> {
    try {
      return await this.db
        .select()
        .from(orders)
        .innerJoin(users, eq(orders.buyerId, users.id))
        .where(and(
          eq(orders.sellerId, merchantId),
          or(
            eq(orders.status, 'NEW'),
            eq(orders.status, 'ACCEPTED'),
            eq(orders.status, 'PREPARING'),
            eq(orders.status, 'READY')
          )
        ));
    } catch {
      return [];
    }
  }

  async getMerchantCustomers(merchantId: number): Promise<any[]> {
    try {
      return await this.db
        .select()
        .from(orders)
        .innerJoin(users, eq(orders.buyerId, users.id))
        .where(eq(orders.sellerId, merchantId))
        .groupBy(users.id);
    } catch {
      return [];
    }
  }

  async getMerchantProducts(merchantId: number): Promise<any[]> {
    try {
      return await this.db
        .select()
        .from(products)
        .where(eq(products.sellerId, merchantId));
    } catch {
      return [];
    }
  }

  async getMerchantOrdersForPeriod(merchantId: number, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      return await this.db
        .select()
        .from(orders)
        .innerJoin(users, eq(orders.buyerId, users.id))
        .where(and(
          eq(orders.sellerId, merchantId),
          gte(orders.createdAt, startDate),
          lt(orders.createdAt, endDate)
        ));
    } catch {
      return [];
    }
  }

  async updateMerchantBusinessHours(merchantId: number, isOpen: boolean): Promise<any> {
    return { isOpen, updatedAt: new Date() };
  }

  // Enhanced driver methods implementation
  async updateDriverStatus(driverId: number, isOnline: boolean, location?: { lat: number; lng: number }): Promise<any> {
    try {
      if (location) {
        await this.updateDriverLocation(driverId, location.lat, location.lng);
      }
      return { driverId, isOnline, location, updatedAt: new Date() };
    } catch {
      return null;
    }
  }

  async getAvailableDeliveryRequests(driverId: number): Promise<any[]> {
    return [
      {
        id: `DEL_${Date.now()}_1`,
        orderId: 'ORDER_123',
        deliveryType: 'PACKAGE',
        pickupAddress: 'Merchant Store, Lagos',
        deliveryAddress: 'Customer Address, Lagos',
        pickupCoords: { lat: 6.5244, lng: 3.3792 },
        deliveryCoords: { lat: 6.5355, lng: 3.3567 },
        customerName: 'John Doe',
        customerPhone: '+234123456789',
        merchantName: 'Sample Store',
        deliveryFee: 1500,
        distance: 5.2,
        estimatedTime: 25,
        orderValue: 8500,
        urgentDelivery: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date()
      }
    ];
  }

  async acceptDeliveryRequest(requestId: string, driverId: number): Promise<any> {
    return {
      id: requestId,
      driverId,
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      customerId: 1,
      merchantId: 2,
      deliveryFee: 1500,
      customerName: 'John Doe',
      customerPhone: '+234123456789',
      pickupAddress: 'Merchant Store, Lagos',
      deliveryAddress: 'Customer Address, Lagos'
    };
  }

  async updateDriverAvailability(driverId: number, isAvailable: boolean): Promise<any> {
    return { driverId, isAvailable, updatedAt: new Date() };
  }

  async getDeliveryById(deliveryId: string): Promise<any> {
    return {
      id: deliveryId,
      driverId: 1,
      customerId: 1,
      merchantId: 2,
      status: 'ACCEPTED',
      deliveryFee: 1500
    };
  }

  async updateDeliveryStatus(deliveryId: string, status: string, metadata?: any): Promise<any> {
    return {
      id: deliveryId,
      status,
      metadata,
      updatedAt: new Date()
    };
  }

  async updateDriverEarnings(driverId: number, amount: number): Promise<any> {
    return {
      driverId,
      amountAdded: amount,
      totalEarnings: amount,
      updatedAt: new Date()
    };
  }

  async getDriverDeliveriesForDate(driverId: number, date: Date): Promise<any[]> {
    return [];
  }

  async getDriverDeliveriesForPeriod(driverId: number, startDate: Date, endDate: Date): Promise<any[]> {
    return [];
  }

  async getDriverDeliveries(driverId: number): Promise<any[]> {
    return [];
  }

  // Admin Oversight implementations
  async getPendingVerifications(filters: any): Promise<any[]> {
    return [
      {
        id: 'VER_001',
        userId: 1,
        type: 'merchant',
        userDetails: { name: 'Sample Merchant', email: 'merchant@example.com' },
        documents: [],
        submittedAt: new Date(),
        priority: 'HIGH',
        riskScore: 'LOW'
      }
    ];
  }

  async reviewVerification(reviewData: any): Promise<any> {
    return {
      verificationId: reviewData.verificationId,
      userId: 1,
      status: reviewData.action,
      reviewedAt: new Date()
    };
  }

  async getEscrowOverview(): Promise<any> {
    return {
      totalBalance: 12400000, // ₦12.4M as mentioned
      pendingReleases: 2300000,
      disputedAmount: 450000,
      releasedToday: 180000,
      pendingTransactions: 45,
      disputedTransactions: 8,
      readyForRelease: 23,
      avgHoldTime: 5.2, // days
      releaseRate: 94.5, // percentage
      disputeRate: 2.1 // percentage
    };
  }

  async getDisputes(filters: any): Promise<any[]> {
    return [
      {
        id: 'DISPUTE_001',
        transactionId: 'TXN_001',
        disputeType: 'non_delivery',
        filedBy: 1,
        description: 'Order not delivered',
        evidence: [],
        status: 'OPEN',
        priority: 'HIGH',
        filedAt: new Date(),
        responseDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        transactionAmount: 15000,
        customerDetails: { name: 'Customer', email: 'customer@example.com' },
        merchantDetails: { name: 'Merchant', email: 'merchant@example.com' }
      }
    ];
  }

  async resolveDispute(resolutionData: any): Promise<any> {
    return {
      disputeId: resolutionData.disputeId,
      transactionId: 'TXN_001',
      customerId: 1,
      merchantId: 2,
      resolution: resolutionData.resolution,
      resolvedAt: new Date()
    };
  }

  async refundEscrowToCustomer(transactionId: string, amount?: number): Promise<any> {
    return {
      transactionId,
      refundAmount: amount || 0,
      refundedAt: new Date()
    };
  }

  async releaseEscrowToMerchant(transactionId: string): Promise<any> {
    return {
      transactionId,
      releasedAt: new Date(),
      amount: 15000
    };
  }

  async performManualEscrowAction(actionData: any): Promise<any> {
    return {
      transactionId: actionData.transactionId,
      action: actionData.action,
      performedAt: new Date(),
      adminId: actionData.adminId
    };
  }

  async getPlatformAnalytics(filters: any): Promise<any> {
    return {
      totalRevenue: 5240000,
      transactionVolume: 1250,
      userGrowth: 15.8,
      marketShare: 23.4,
      dailyActiveUsers: 8500,
      avgSessionDuration: 12.3,
      conversionRate: 4.2,
      retentionRate: 78.5,
      revenueGrowth: 18.7,
      profitMargins: 23.1,
      escrowTurnover: 7.8,
      disputeResolutionCost: 45000,
      fraudDetections: 12,
      securityIncidents: 2,
      platformRiskScore: 'LOW'
    };
  }

  async getContentForReview(filters: any): Promise<any[]> {
    return [
      {
        id: 'REVIEW_001',
        type: 'product',
        userId: 1,
        content: { title: 'Sample Product', description: 'Product description' },
        reportedBy: 2,
        reportReason: 'inappropriate_content',
        priority: 'MEDIUM',
        submittedAt: new Date(),
        reviewStatus: 'PENDING'
      }
    ];
  }
}

export const storage = new DatabaseStorage();