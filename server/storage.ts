import { 
  users, otpCodes, categories, products, cartItems, userLocations, orders,
  type User, type InsertUser, type OtpCode, type InsertOtpCode,
  type Category, type InsertCategory, type Product, type InsertProduct,
  type CartItem, type InsertCartItem, type UserLocation, type InsertUserLocation,
  type Order, type InsertOrder
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
}

export const storage = new DatabaseStorage();