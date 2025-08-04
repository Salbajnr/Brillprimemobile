import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerFuelOrderRoutes } from "./routes/fuel-orders";
import { registerQRPaymentRoutes } from "./routes/qr-payments";
import { registerRealTimeTrackingRoutes } from "./routes/real-time-tracking";
import { registerDriverMerchantCoordinationRoutes } from "./routes/driver-merchant-coordination";
import { registerLiveChatRoutes } from "./routes/live-chat";
import { registerOrderStatusRoutes } from "./routes/order-status";
import { registerTestRealtimeRoutes } from "./routes/test-realtime";
import { insertUserSchema, signInSchema, otpVerificationSchema, insertCategorySchema, insertProductSchema, insertUserLocationSchema, insertCartItemSchema, insertVendorPostSchema, insertSupportTicketSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import "./middleware/auth"; // Import type declarations
import { Request, Response } from 'express';
import cors from 'cors';
import { db } from './db';
import { users, supportTickets, contentReports, wallets, transactions, paymentMethods, vendorPosts, vendorPostLikes, products, orders, socialProfiles } from '../shared/schema';
import { eq, and, desc, count, sql, or, like } from "drizzle-orm";
import jwt from 'jsonwebtoken';
import { requireAuth, auth, verifyToken } from './middleware/auth';
import { handleSocialAuth, linkSocialAccount, getLinkedSocialAccounts, unlinkSocialAccount } from './auth/social-auth';
import multer from 'multer';
import { emailService } from "./services/email";
import { registerEscrowManagementRoutes } from "./routes/escrow-management";

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Enhanced Social Authentication Routes
  app.post("/api/auth/social-login", handleSocialAuth);
  app.post("/api/auth/link-social", linkSocialAccount);
  app.get("/api/auth/social-accounts", getLinkedSocialAccounts);
  app.delete("/api/auth/social-accounts/:provider", unlinkSocialAccount);

  // Sign up endpoint
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Validate email format
      if (!emailService.isValidEmail(userData.email)) {
        return res.status(400).json({ message: "Invalid email address format" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Generate OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.createOtpCode({
        email: user.email,
        code: otpCode,
        expiresAt
      });

      // Send OTP via email service
      const emailSent = await emailService.sendOTP(user.email, otpCode, user.fullName);

      if (!emailSent) {
        // If email fails, still allow registration but log the error
        console.error(`Failed to send OTP email to ${user.email}`);
      }

      // In a real app, send OTP via email service
      console.log(`OTP for ${user.email}: ${otpCode}`);

      res.json({ 
        message: "User registered successfully. Please verify your email.",
        userId: user.id,
        emailSent
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  // Verify OTP endpoint
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = otpVerificationSchema.parse(req.body);

      const otpRecord = await storage.getOtpCode(email, otp);
      if (!otpRecord) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Mark OTP as used and verify user
      await storage.markOtpAsUsed(otpRecord.id);
      await storage.verifyUser(email);

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(400).json({ message: "Invalid OTP data" });
    }
  });

  // Social login endpoint
  app.post("/api/auth/social-login", async (req, res) => {
    try {
      const { provider, socialId, email, name, picture } = req.body;

      if (!provider || !socialId || !email) {
        return res.status(400).json({ message: "Missing required social login data" });
      }

      // Validate provider
      const validProviders = ['google', 'apple', 'facebook'];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ message: "Invalid social login provider" });
      }

      // Check if user exists with social ID
      let user = await storage.getUserBySocialId(provider, socialId);

      if (!user) {
        // Check if user exists with email
        const existingUser = await storage.getUserByEmail(email);

        if (existingUser && !existingUser.socialProvider) {
          // User exists with regular account, link social account
          await storage.linkSocialAccount(existingUser.id, provider, socialId, picture);
          user = await storage.getUserByEmail(email);
        } else if (existingUser && existingUser.socialProvider !== provider) {
          return res.status(400).json({ 
            message: `An account with this email already exists using ${existingUser.socialProvider} login. Please use ${existingUser.socialProvider} to sign in.` 
          });
        } else {
          // Create new social user
          user = await storage.createSocialUser({
            fullName: name || email.split('@')[0],
            email,
            socialProvider: provider,
            socialId,
            profilePicture: picture,
            role: 'CONSUMER' // Default role for social login
          });
        }
      } else {
        // Update profile picture if provided
        if (picture && picture !== user.profilePicture) {
          await storage.updateUserProfilePicture(user.id, picture);
          user.profilePicture = picture;
        }
      }

      if (!user) {
        return res.status(500).json({ message: "Failed to create or retrieve user" });
      }

      // Create session for social login
      const userWithoutPassword = {
        id: user.id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: Boolean(user.isVerified),
        profilePicture: user.profilePicture || undefined,
        socialProvider: user.socialProvider
      };

      req.session.userId = user.id;
      req.session.user = userWithoutPassword;

      // Log successful social login
      console.log(`Social login successful: ${email} via ${provider}`);

      res.json({ 
        message: "Social login successful",
        user: userWithoutPassword,
        isNewUser: !user.createdAt || (Date.now() - new Date(user.createdAt).getTime()) < 60000 // Less than 1 minute old
      });
    } catch (error) {
      console.error("Social login error:", error);
      res.status(500).json({ message: "Social login failed. Please try again." });
    }
  });

  // Push notification subscription endpoint
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { subscription } = req.body;

      if (!subscription) {
        return res.status(400).json({ message: "Subscription data required" });
      }

      // Store push subscription in database
      await storage.storePushSubscription(req.session.userId, subscription);

      res.json({ message: "Push subscription saved successfully" });
    } catch (error) {
      console.error("Push subscription error:", error);
      res.status(500).json({ message: "Failed to save push subscription" });
    }
  });

  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await storage.removePushSubscription(req.session.userId);

      res.json({ message: "Push subscription removed successfully" });
    } catch (error) {
      console.error("Push unsubscribe error:", error);
      res.status(500).json({ message: "Failed to remove push subscription" });
    }
  });

  // Sign in endpoint
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = signInSchema.parse(req.body);

      let user;
      try {
        user = await storage.getUserByEmail(email);
      } catch (dbError) {
        console.error("Database error during user lookup:", dbError);
        return res.status(500).json({ message: "Database connection error. Please ensure database is properly set up." });
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isVerified) {
        return res.status(401).json({ message: "Please verify your email first" });
      }

      // Create session
      const { password: _, ...userData } = user;
      const userWithoutPassword = {
        ...userData,
        isVerified: Boolean(userData.isVerified),
        profilePicture: userData.profilePicture || undefined
      };
      req.session.userId = user.id;
      req.session.user = userWithoutPassword;

      res.json({ 
        message: "Login successful",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Signin error:", error);
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Resend OTP endpoint
  app.post("/api/auth/resend-otp", async (req, res) => {
    try {
      const { email } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate new OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.createOtpCode({
        email: user.email,
        code: otpCode,
        expiresAt
      });

      // Send OTP via email service
      const emailSent = await emailService.sendOTP(user.email, otpCode, user.fullName);

      if (!emailSent) {
        // If email fails, still allow registration but log the error
        console.error(`Failed to send OTP email to ${user.email}`);
      }

      // In a real app, send OTP via email service
      console.log(`New OTP for ${user.email}: ${otpCode}`);

      res.json({ message: "OTP sent successfully", emailSent });
    } catch (error) {
      console.error("Resend OTP error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // User location endpoints
  app.post("/api/user/location", async (req, res) => {
    try {
      const locationData = insertUserLocationSchema.parse(req.body);

      // Update or create user location
      const location = await storage.upsertUserLocation(locationData);

      res.json({ 
        success: true,
        message: "Location updated successfully",
        location 
      });
    } catch (error) {
      console.error("Location update error:", error);
      res.status(400).json({ success: false, message: "Invalid location data" });
    }
  });

  app.get("/api/user/nearby", async (req, res) => {
    try {
      const { lat, lng, role, radius = 5000 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({ success: false, message: "Latitude and longitude required" });
      }

      const nearbyUsers = await storage.getNearbyUsers(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string),
        role as string
      );

      res.json({ 
        success: true,
        users: nearbyUsers 
      });
    } catch (error) {
      console.error("Nearby users error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch nearby users" });
    }
  });

  // Categories endpoints
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json({ success: true, categories });
    } catch (error) {
      console.error("Categories fetch error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);

      res.json({ 
        success: true,
        message: "Category created successfully",
        category 
      });
    } catch (error) {
      console.error("Category creation error:", error);
      res.status(400).json({ success: false, message: "Invalid category data" });
    }
  });

  // Products endpoints
  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId, search, limit = 50, offset = 0 } = req.query;

      const products = await storage.getProducts({
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        search: search as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({ success: true, products });
    } catch (error) {
      console.error("Products fetch error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);

      res.json({ 
        success: true,
        message: "Product created successfully",
        product 
      });
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(400).json({ success: false, message: "Invalid product data" });
    }
  });

  // Cart endpoints
  app.get("/api/cart/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const cartItems = await storage.getCartItems(userId);

      res.json({ success: true, cartItems });
    } catch (error) {
      console.error("Cart fetch error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const cartData = insertCartItemSchema.parse(req.body);
      const cartItem = await storage.addToCart(cartData);

      res.json({ 
        success: true,
        message: "Item added to cart",
        cartItem 
      });
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(400).json({ success: false, message: "Failed to add item to cart" });
    }
  });

  app.put("/api/cart/:id", async (req, res) => {
    try {
      const cartItemId = parseInt(req.params.id);
      const { quantity } = req.body;

      const cartItem = await storage.updateCartItem(cartItemId, quantity);

      res.json({ 
        success: true,
        message: "Cart updated",
        cartItem 
      });
    } catch (error) {
      console.error("Cart update error:", error);
      res.status(400).json({ success: false, message: "Failed to update cart" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      const cartItemId = parseInt(req.params.id);
      await storage.removeFromCart(cartItemId);

      res.json({ 
        success: true,
        message: "Item removed from cart"
      });
    } catch (error) {
      console.error("Cart removal error:", error);
      res.status(500).json({ success: false, message: "Failed to remove item from cart" });
    }
  });

  // Vendor Feed Routes

  // Enhanced vendor posts with real database integration
  app.get("/api/vendor-posts", async (req, res) => {
    try {
      const { limit = 20, offset = 0, vendorId } = req.query;

      const posts = await db.select({
        id: vendorPosts.id,
        vendorId: vendorPosts.vendorId,
        productId: vendorPosts.productId,
        content: vendorPosts.content,
        imageUrl: vendorPosts.imageUrl,
        price: vendorPosts.price,
        location: vendorPosts.location,
        isAvailable: vendorPosts.isAvailable,
        createdAt: vendorPosts.createdAt,
        // Vendor details
        vendorName: users.fullName,
        vendorProfilePicture: users.profilePicture,
        vendorRole: users.role,
        // Product details
        productName: products.name,
        productDescription: products.description,
        // Like count
        likesCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${vendorPostLikes} 
          WHERE ${vendorPostLikes.postId} = ${vendorPosts.id}
        )`
      })
      .from(vendorPosts)
      .leftJoin(users, eq(vendorPosts.vendorId, users.id))
      .leftJoin(products, eq(vendorPosts.productId, products.id))
      .where(vendorId ? eq(vendorPosts.vendorId, parseInt(vendorId as string)) : undefined)
      .orderBy(desc(vendorPosts.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

      res.json(posts);
    } catch (error) {
      console.error("Get vendor posts error:", error);
      res.status(500).json({ message: "Failed to fetch vendor posts" });
    }
  });

  // Create vendor post
  app.post("/api/vendor-posts", async (req, res) => {
    try {
      // Check if user is authenticated (in a real app, this would be middleware)
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.role !== "MERCHANT") {
        return res.status(403).json({ message: "Only merchants can create posts" });
      }

      const postData = insertVendorPostSchema.parse(req.body);
      const post = await storage.createVendorPost(postData);

      res.json(post);
    } catch (error) {
      console.error("Create vendor post error:", error);
      res.status(400).json({ message: "Invalid post data" });
    }
  });

  // Like vendor post
  app.post("/api/vendor-posts/:postId/like", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { postId } = req.params;
      const like = await storage.likeVendorPost(postId, req.session.userId);

      res.json(like);
    } catch (error) {
      console.error("Like post error:", error);
      res.status(500).json({ message: "Failed to like post" });
    }
  });

  // Search API for locations, merchants, and fuel stations
  app.get("/api/search", async (req, res) => {
    try {
      const { q, type, latitude, longitude } = req.query;
      const searchQuery = q as string;
      const searchType = type as string || 'all';
      const lat = latitude ? parseFloat(latitude as string) : null;
      const lng = longitude ? parseFloat(longitude as string) : null;

      if (!searchQuery) {
        return res.status(400).json({ message: "Search query required" });
      }

      const results: any[] = [];

      if (searchType === 'all' || searchType === 'merchants') {
        // Search merchants
        const merchants = await db.select({
          id: users.id,
          name: users.fullName,
          type: sql`'merchant'`,
          address: users.address,
          city: users.city,
          state: users.state,
          profilePicture: users.profilePicture
        })
        .from(users)
        .where(
          and(
            eq(users.role, 'MERCHANT'),
            or(
              like(users.fullName, `%${searchQuery}%`),
              like(users.address, `%${searchQuery}%`),
              like(users.city, `%${searchQuery}%`)
            )
          )
        )
        .limit(10);

        results.push(...merchants.map(merchant => ({
          id: merchant.id.toString(),
          name: merchant.name,
          type: 'merchant',
          address: `${merchant.address || ''}, ${merchant.city || ''}, ${merchant.state || ''}`.replace(/^,\s*|,\s*$/g, ''),
          distance: lat && lng ? calculateDistance(lat, lng, parseFloat(merchant.address?.split(',')[0] || '0'), parseFloat(merchant.address?.split(',')[1] || '0')) : null,
          profilePicture: merchant.profilePicture
        })));
      }

      if (searchType === 'all' || searchType === 'areas') {
        // Search areas/locations based on city/state
        const locations = await db.select({
          city: users.city,
          state: users.state,
          count: sql<number>`count(*)::int`
        })
        .from(users)
        .where(
          and(
            eq(users.role, 'MERCHANT'),
            or(
              like(users.city, `%${searchQuery}%`),
              like(users.state, `%${searchQuery}%`)
            )
          )
        )
        .groupBy(users.city, users.state)
        .limit(5);

        results.push(...locations.map(location => ({
          id: `${location.city}-${location.state}`.toLowerCase().replace(/\s+/g, '-'),
          name: location.city,
          type: 'area',
          address: `${location.city}, ${location.state}, Nigeria`,
          distance: lat && lng ? calculateDistance(lat, lng, 6.5244, 3.3792) : null, // Lagos center coordinates as reference
          merchantCount: location.count
        })));
      }

      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Wishlist Routes (placeholder implementations)
  app.post("/api/wishlist", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { productId } = req.body;
      await storage.addToWishlist(req.session.userId, productId);

      res.json({ message: "Added to wishlist successfully" });
    } catch (error) {
      console.error("Add to wishlist error:", error);
      res.status(500).json({ message: "Failed to add to wishlist" });
    }
  });

  app.get("/api/wishlist/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const wishlistItems = await storage.getWishlistItems(userId);

      res.json({ success: true, wishlistItems });
    } catch (error) {
      console.error("Wishlist fetch error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch wishlist" });
    }
  });

  // Chat Routes

  // Get conversations for user with role-based filtering
  app.get("/api/conversations", async (req, res) => {
    try {
      const { userId, role } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const conversations = await storage.getConversations(parseInt(userId as string), role as string);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const conversationData = req.body;
      const conversation = await storage.createConversation(conversationData);

      res.json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(400).json({ message: "Failed to create conversation" });
    }
  });

  // Get messages for conversation
  app.get("/api/conversations/:conversationId/messages", async (req, res) => {
    try {
      const { conversationId } = req.params;
      const messages = await storage.getMessages(conversationId);

      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send message
  app.post("/api/messages", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const messageData = req.body;
      const message = await storage.sendMessage(messageData);

      res.json(message);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(400).json({ message: "Failed to send message" });
    }
  });

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.user = req.session.user;
    next();
  };

  const requireRole = (role: string) => (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };

  // Driver registration endpoint
  app.post("/api/driver/register", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const registrationData = req.body;

      // Update user role to DRIVER
      await storage.updateUser(userId, { role: 'DRIVER' });

      // Create driver profile
      const driverProfile = await storage.createDriverProfile({
        userId,
        driverTier: registrationData.driverTier || 'STANDARD',
        accessLevel: registrationData.accessLevel || 'OPEN',
        vehicleType: registrationData.vehicleType,
        vehiclePlate: registrationData.vehiclePlate,
        vehicleModel: registrationData.vehicleModel,
        vehicleYear: registrationData.vehicleYear,
        driverLicense: registrationData.driverLicense,
        specializations: JSON.stringify(registrationData.specializations || []),
        bondInsurance: registrationData.bondInsurance || false,
        backgroundCheckStatus: registrationData.backgroundCheckStatus || 'PENDING',
        securityClearance: registrationData.securityClearance || 'NONE',
        maxCargoValue: registrationData.maxCargoValue || '50000',
        vehicleDocuments: JSON.stringify(registrationData.vehicleDocuments || [])
      });

      // Update session with new role
      req.session.user = {
        ...req.session.user,
        role: 'DRIVER'
      };

      res.json({
        message: "Driver registration successful",
        profile: driverProfile
      });
    } catch (error) {
      console.error("Driver registration error:", error);
      res.status(500).json({ message: "Driver registration failed" });
    }
  });

  // Driver Dashboard API Endpoints
  app.get("/api/driver/profile", requireAuth, requireRole('DRIVER'), async (req, res) => {
    try {
      const driverProfile = await storage.getDriverProfile(req.user.id);
      res.json(driverProfile);
    } catch (error) {
      console.error("Get driver profile error:", error);
      res.status(500).json({ message: "Error fetching driver profile" });
    }
  });

  app.get("/api/driver/available-jobs", requireAuth, requireRole('DRIVER'), async (req, res) => {
    try {
      const jobs = await storage.getAvailableDeliveryJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Get available jobs error:", error);
      res.status(500).json({ message: "Error fetching available jobs" });
    }
  });

  app.post("/api/driver/accept-job/:jobId", requireAuth, requireRole('DRIVER'), async (req, res) => {
    try {
      const { jobId } = req.params;
      await storage.acceptDeliveryJob(jobId, req.user.id);
      res.json({ message: "Job accepted successfully" });
    } catch (error) {
      console.error("Accept job error:", error);
      res.status(500).json({ message: "Error accepting job" });
    }
  });

  app.get("/api/driver/earnings", requireAuth, requireRole('DRIVER'), async (req, res) => {
    try {
      const earnings = await storage.getDriverEarnings(req.user.id);
      res.json(earnings);
    } catch (error) {
      console.error("Get driver earnings error:", error);
      res.status(500).json({ message: "Error fetching earnings" });
    }
  });

  app.get("/api/driver/delivery-history", requireAuth, requireRole('DRIVER'), async (req, res) => {
    try {
      const history = await storage.getDriverDeliveryHistory(req.user.id);
      res.json(history);
    } catch (error) {
      console.error("Get delivery history error:", error);
      res.status(500).json({ message: "Error fetching delivery history" });
    }
  });

  app.put("/api/driver/update-location", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'DRIVER') {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { latitude, longitude, accuracy } = req.body;
      await storage.updateDriverLocation(req.user.id, { latitude, longitude, accuracy });
      res.json({ message: "Location updated successfully" });
    } catch (error) {
      console.error("Update location error:", error);
      res.status(500).json({ message: "Error updating location" });
    }
  });

  // Merchant Dashboard API Endpoints
  app.get("/api/merchant/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const merchantProfile = await storage.getMerchantProfile(req.user.id);
      res.json(merchantProfile);
    } catch (error) {
      console.error("Get merchant profile error:", error);
      res.status(500).json({ message: "Error fetching merchant profile" });
    }
  });

  app.get("/api/merchant/dashboard-stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'MERCHANT') {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const stats = await storage.getMerchantDashboardStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Error fetching dashboard stats" });
    }
  });

  app.get("/api/merchant/orders", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'MERCHANT') {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const orders = await storage.getMerchantOrders(req.user.id);
      res.json(orders);
    } catch (error) {
      console.error("Get merchant orders error:", error);
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  app.put("/api/merchant/order/:orderId/status", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'MERCHANT') {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { orderId } = req.params;
      const { status } = req.body;
      await storage.updateOrderStatus(orderId, status, req.user.id);
      res.json({ message: "Order status updated successfully" });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ message: "Error updating order status" });
    }
  });

  app.get("/api/merchant/analytics", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'MERCHANT') {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { period = '7d' } = req.query;
      const analytics = await storage.getMerchantAnalytics(req.user.id, period as string);
      res.json(analytics);
    } catch (error) {
      console.error("Get merchant analytics error:", error);
      res.status(500).json({ message: "Error fetching analytics" });
    }
  });

  // Transactions API
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const { userId, limit = 10, offset = 0 } = req.query;
      const userIdNum = userId ? parseInt(userId as string) : req.session!.userId!;

      const transactionResults = await db.select({
        id: sql`'txn_' || ${transactions.id}::text`,
        type: sql`CASE 
          WHEN ${transactions.type} IN ('DEPOSIT', 'REFUND', 'ESCROW_RELEASE') THEN 'credit'::text
          ELSE 'debit'::text
        END`,
        description: transactions.description,
        amount: transactions.amount,
        date: transactions.createdAt,
        status: transactions.status
      })
      .from(transactions)
      .where(eq(transactions.userId, userIdNum))
      .orderBy(desc(transactions.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

      res.json({ success: true, transactions: transactionResults });
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch transactions" });
    }
  });

  // Wallet balance API
  app.get("/api/wallet/balance", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      // Get wallet balance from wallets table or calculate from transactions
      const walletResult = await db.select({
        balance: wallets.balance
      })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

      const balance = walletResult.length > 0 ? parseFloat(walletResult[0].balance || '0') : 0;

      res.json({ success: true, balance });
    } catch (error) {
      console.error("Get wallet balance error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch wallet balance" });
    }
  });

  // Payment Methods API
  app.get("/api/payment-methods", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const methods = await db.select({
        id: paymentMethods.id,
        type: paymentMethods.type,
        cardLast4: paymentMethods.cardLast4,
        cardType: paymentMethods.cardType,
        cardBank: paymentMethods.cardBank,
        bankName: paymentMethods.bankName,
        accountName: paymentMethods.accountName,
        isDefault: paymentMethods.isDefault,
        isActive: paymentMethods.isActive,
        createdAt: paymentMethods.createdAt
      })
      .from(paymentMethods)
      .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.isActive, true)))
      .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt));

      res.json({ success: true, paymentMethods: methods });
    } catch (error) {
      console.error("Get payment methods error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch payment methods" });
    }
  });

  // Create payment method
  app.post("/api/payment-methods", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { type, cardLast4, cardType, cardBank, bankName, accountName, isDefault } = req.body;

      // If setting as default, unset other defaults first
      if (isDefault) {
        await db.update(paymentMethods)
          .set({ isDefault: false })
          .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.isDefault, true)));
      }

      const newMethod = await db.insert(paymentMethods).values({
        userId,
        type,
        provider: 'paystack', // Default to paystack
        cardLast4: cardLast4 || null,
        cardType: cardType || null,
        cardBank: cardBank || null,
        bankName: bankName || null,
        accountName: accountName || null,
        isDefault: isDefault || false,
        isActive: true
      }).returning();

      res.json({ success: true, paymentMethod: newMethod[0] });
    } catch (error) {
      console.error("Create payment method error:", error);
      res.status(500).json({ success: false, message: "Failed to create payment method" });
    }
  });

  // Orders API for real order history integration
  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { status, limit = 20, offset = 0 } = req.query;

      let whereCondition = eq(orders.userId, userId);
      if (status) {
        whereCondition = and(eq(orders.userId, userId), eq(orders.status, status as string));
      }

      const userOrders = await db.select({
        id: orders.id,
        userId: orders.userId,
        merchantId: orders.merchantId,
        totalAmount: orders.totalAmount,
        status: orders.status,
        deliveryAddress: orders.deliveryAddress,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        // Merchant details
        merchantName: users.fullName,
        merchantProfilePicture: users.profilePicture
      })
      .from(orders)
      .leftJoin(users, eq(orders.merchantId, users.id))
      .where(whereCondition)
      .orderBy(desc(orders.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

      res.json({ success: true, orders: userOrders });
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
  });

  app.post("/api/merchant/request-delivery", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'MERCHANT') {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const deliveryData = req.body;
      const deliveryRequest = await storage.createDeliveryRequest({
        ...deliveryData,
        merchantId: req.user.id
      });
      res.json(deliveryRequest);
    } catch (error) {
      console.error("Create delivery request error:", error);
      res.status(500).json({ message: "Error creating delivery request" });
    }
  });

  // Driver Registration API Endpoint
  app.post("/api/driver/register", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const driverData = req.body;
      const driverProfile = await storage.createDriverProfile({
        ...driverData,
        userId: req.user.id,
        totalDeliveries: 0,
        totalEarnings: "0",
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        isActive: true
      });

      res.json({ 
        message: "Driver registration successful", 
        profile: driverProfile 
      });
    } catch (error) {
      console.error("Driver registration error:", error);
      res.status(500).json({ message: "Error registering driver" });
    }
  });

  // Support Tickets API Endpoints
  // Identity verification
  app.post("/api/auth/verify-identity", async (req, res) => {
    try {
      // Simple mock verification endpoint
      const { userId, role } = req.body;

      console.log(`Identity verification submitted for user ${userId} with role ${role}`);

      res.json({
        status: 'Success',
        message: 'Identity verification submitted successfully',
        data: { verificationId: 'mock-verification-id' }
      });

    } catch (error) {
      console.error('Identity verification error:', error);
      res.status(500).json({
        status: 'Error',
        message: 'Failed to submit identity verification'
      });
    }
  });

  app.post("/api/support/tickets", async (req, res) => {
    try {
      const ticketData = insertSupportTicketSchema.parse(req.body);

      const ticket = await storage.createSupportTicket(ticketData);

      // Emit WebSocket event for real-time notification to admin dashboards
      if (global.io) {
        global.io.to('admin_support').emit('new_support_ticket', {
          type: 'new_support_ticket',
          ticket: ticket,
          timestamp: Date.now()
        });
      }

      res.json({ 
        message: "Support ticket created successfully",
        ticketNumber: ticket.ticketNumber
      });
    } catch (error) {
      console.error("Create support ticket error:", error);
      res.status(400).json({ message: "Failed to create support ticket" });
    }
  });

  app.get("/api/support/tickets", async (req, res) => {
    try {
      // Admin endpoint - in real app would check admin permissions
      const { status, priority, userRole } = req.query;

      const tickets = await storage.getSupportTickets({
        status: status as string,
        priority: priority as string,
        userRole: userRole as string
      });

      res.json(tickets);
    } catch (error) {
      console.error("Get support tickets error:", error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  // Register payment routes
  const { registerPaymentRoutes } = await import("./routes/payments");
  registerPaymentRoutes(app);

  app.get("/api/support/tickets/:ticketId", async (req, res) => {
    try {
      const { ticketId } = req.params;
      const ticket = await storage.getSupportTicket(ticketId);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      console.error("Get support ticket error:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.put("/api/support/tickets/:ticketId", async (req, res) => {
    try {
      // Admin endpoint - in real app would check admin permissions
      const { ticketId } = req.params;
      const updateData = req.body;

      const updatedTicket = await storage.updateSupportTicket(ticketId, updateData);

      res.json({
        message: "Ticket updated successfully",
        ticket: updatedTicket
      });
    } catch (error) {
      console.error("Update support ticket error:", error);
      res.status(400).json({ message: "Failed to update ticket" });
    }
  });

  // Merchant Discovery Routes
  app.get("/api/merchants/search", async (req, res) => {
    try {
      const { lat, lng, radius = 10, category, searchTerm } = req.query;

      const merchants = await storage.searchMerchants({
        latitude: lat ? parseFloat(lat as string) : undefined,
        longitude: lng ? parseFloat(lng as string) : undefined,
        radius: parseInt(radius as string),
        category: category as string,
        searchTerm: searchTerm as string
      });

      res.json({ 
        success: true, 
        merchants,
        count: merchants.length 
      });
    } catch (error) {
      console.error("Merchant search error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Search failed" 
      });
    }
  });

  app.get("/api/merchants/:id", async (req, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      const merchant = await storage.getMerchantProfile(merchantId);

      if (!merchant) {
        return res.status(404).json({ 
          success: false, 
          message: "Merchant not found" 
        });
      }

      res.json({ 
        success: true, 
        merchant 
      });
    } catch (error) {
      console.error("Get merchant error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get merchant" 
      });
    }
  });

  app.get("/api/merchants/:id/products", async (req, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      const products = await storage.getMerchantProducts(merchantId);

      res.json({ 
        success: true, 
        products 
      });
    } catch (error) {
      console.error("Get merchant products error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get products" 
      });
    }
  });

  // Fuel Station Discovery Routes  
  app.get("/api/fuel-stations", async (req, res) => {
    try {
      const { lat, lng, radius = 15, fuelType } = req.query;

      const stations = await storage.getFuelStations({
        latitude: lat ? parseFloat(lat as string) : undefined,
        longitude: lng ? parseFloat(lng as string) : undefined,
        radius: parseInt(radius as string),
        fuelType: fuelType as string
      });

      res.json({ 
        success: true, 
        stations,
        count: stations.length 
      });
    } catch (error) {
      console.error("Fuel stations search error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to find fuel stations" 
      });
    }
  });

  // Register fuel order routes
  registerFuelOrderRoutes(app);

  // Register QR payment routes
  registerQRPaymentRoutes(app);

  // Register real-time tracking routes
  registerRealTimeTrackingRoutes(app);

  // Register driver-merchant coordination routes
  registerDriverMerchantCoordinationRoutes(app);

  // Register live chat routes
  registerLiveChatRoutes(app);

  // Register order status broadcasting routes
  registerOrderStatusRoutes(app);

  // Register test routes for real-time features
  registerTestRealtimeRoutes(app);
  registerEscrowManagementRoutes(app);

    // Authentication middleware
  const auth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.user = req.session.user;
    next();
  };

  // Support ticket creation endpoint (public)
  app.post('/api/support/tickets', async (req, res) => {
    try {
      const ticketData = insertSupportTicketSchema.parse(req.body);

      const ticket = await storage.createSupportTicket(ticketData);

      // Emit WebSocket event for real-time notification to admin dashboards
      if (global.io) {
        global.io.to('admin_support').emit('new_support_ticket', {
          type: 'new_support_ticket',
          ticket: ticket,
          timestamp: Date.now()
        });
      }

      res.json({ 
        message: "Support ticket created successfully",
        ticketNumber: ticket.ticketNumber
      });
    } catch (error) {
      console.error("Create support ticket error:", error);
      res.status(400).json({ message: "Failed to create support ticket" });
    }
  });

  // Content reporting endpoint (authenticated users)
  app.post('/api/content/report', auth, async (req, res) => {
    try {
      const { contentType, contentId, reason } = req.body;
      const userId = req.session.userId;

      // Validate content type
      const validContentTypes = ['POST', 'COMMENT', 'PRODUCT', 'USER'];
      if (!validContentTypes.includes(contentType)) {
        return res.status(400).json({ success: false, message: 'Invalid content type' });
      }

      // Check if user already reported this content
      const existingReport = await db.select()
        .from(contentReports)
        .where(and(
          eq(contentReports.reportedBy, userId),
          eq(contentReports.contentType, contentType),
          eq(contentReports.contentId, contentId)
        ))
        .limit(1);

      if (existingReport.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'You have already reported this content' 
        });
      }

      // Create content report
      const report = await db.insert(contentReports).values({
        reportedBy: userId,
        contentType,
        contentId,
        reason,
        status: 'PENDING'
      }).returning();

      // Emit WebSocket event for real-time admin notification
      if (global.io) {
        global.io.to('admin_moderation').emit('new_content_report', {
          type: 'new_content_report',
          report: report[0],
          contentType,
          contentId,
          timestamp: Date.now()
        });
      }

      res.json({ 
        success: true, 
        message: 'Content report submitted successfully',
        data: { reportId: report[0].id }
      });
    } catch (error) {
      console.error('Create content report error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit content report' });
    }
  });

  // Get user's content reports
  app.get('/api/content/reports', auth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const reports = await db.select({
        id: contentReports.id,
        contentType: contentReports.contentType,
        contentId: contentReports.contentId,
        reason: contentReports.reason,
        status: contentReports.status,
        createdAt: contentReports.createdAt,
        updatedAt: contentReports.updatedAt
      })
      .from(contentReports)
      .where(eq(contentReports.reportedBy, userId))
      .orderBy(desc(contentReports.createdAt))
      .limit(limit)
      .offset(offset);

      const totalCount = await db.select({ count: count() })
        .from(contentReports)
        .where(eq(contentReports.reportedBy, userId));

      res.json({
        success: true,
        data: {
          reports,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount[0].count / limit),
            totalReports: totalCount[0].count,
            hasNext: page * limit < totalCount[0].count,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Get user reports error:', error);
      res.status(500).json({ success: false, message: 'Failed to get reports' });
    }
  });

  // Import routes
  // Import routes
  // Import routes
  // Import routes
  // Import routes
  // Import routes
  // Import routes
  // Import routes
  const httpServer = createServer(app);
  return httpServer;
}

export function setupRoutes(app: any) {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  // CORS middleware
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ['http://localhost:3000', 'http://0.0.0.0:3000', 'http://127.0.0.1:3000'],
    credentials: true
  }));

  // Health check endpoint for E2E tests
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      websocket: true,
      timestamp: Date.now() 
    });
  });

  // Password reset endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email } = req.body;

      // Validate email format
      if (!emailService.isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email address format" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with this email exists, a reset link has been sent." });
      }

      // Generate reset token
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Send password reset email
      const emailSent = await emailService.sendPasswordResetEmail(user.email, resetToken, user.fullName);

      // Store reset token (you'd need to add this to your schema)
      console.log(`Password reset token for ${email}: ${resetToken}`);

      if (!emailSent) {
        console.error(`Failed to send password reset email to ${email}`);
      }

      res.json({ 
        message: "If an account with this email exists, a reset link has been sent.",
        emailSent: emailSent
      });
    } catch (error) {
      console.error("Password reset error:", error);
      if (error.message?.includes("Invalid email")) {
        res.status(400).json({ message: "Invalid email address format" });
      } else {
        res.status(500).json({ message: "Failed to process password reset request" });
      }
    }
  });

  // Register additional route modules
  registerFuelOrderRoutes(app);
  registerQRPaymentRoutes(app);
  registerRealTimeTrackingRoutes(app);
  registerDriverMerchantCoordinationRoutes(app);
  registerLiveChatRoutes(app);
  registerOrderStatusRoutes(app);
  registerTestRealtimeRoutes(app);
  registerEscrowManagementRoutes(app);

  const server = createServer(app);
  return server;
}