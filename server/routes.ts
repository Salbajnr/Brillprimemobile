import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, signInSchema, otpVerificationSchema, insertCategorySchema, insertProductSchema, insertUserLocationSchema, insertCartItemSchema, insertVendorPostSchema, insertSupportTicketSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import "./middleware/auth"; // Import type declarations

export async function registerRoutes(app: Express): Promise<Server> {
  // Sign up endpoint
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
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

      // In a real app, send OTP via email service
      console.log(`OTP for ${user.email}: ${otpCode}`);

      res.json({ 
        message: "User registered successfully. Please verify your email.",
        userId: user.id 
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
      
      // Check if user exists with social ID
      let user = await storage.getUserBySocialId(provider, socialId);
      
      if (!user) {
        // Check if user exists with email
        user = await storage.getUserByEmail(email);
        
        if (user) {
          return res.status(400).json({ 
            message: "An account with this email already exists. Please sign in with your password." 
          });
        }
        
        // Create new social user
        user = await storage.createSocialUser({
          fullName: name,
          email,
          socialProvider: provider,
          socialId,
          profilePicture: picture
        });
      }

      // Create session for social login
      const userWithoutPassword = {
        id: user.id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: Boolean(user.isVerified),
        profilePicture: user.profilePicture || undefined
      };
      
      req.session.userId = user.id;
      req.session.user = userWithoutPassword;
      
      res.json({ 
        message: "Social login successful",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Social login error:", error);
      res.status(400).json({ message: "Social login failed" });
    }
  });

  // Sign in endpoint
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = signInSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
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

  // Biometric signin endpoint
  app.post("/api/auth/biometric-signin", async (req, res) => {
    try {
      const { email, biometricType, credentialId } = req.body;
      
      if (!email || !biometricType || !credentialId) {
        return res.status(400).json({ message: "Missing biometric authentication data" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      // Verify biometric credential (in a real implementation, you would verify the WebAuthn assertion)
      // For now, we'll just check if the credential ID matches what's stored
      const storedCredentialId = user.biometricCredentialId;
      if (storedCredentialId !== credentialId) {
        return res.status(400).json({ message: "Invalid biometric credentials" });
      }
      
      // Create user session
      const userWithoutPassword = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: Boolean(user.isVerified),
        profilePicture: user.profilePicture || undefined
      };
      
      req.session.userId = user.id;
      req.session.user = userWithoutPassword;
      
      res.json({ 
        message: "Biometric authentication successful",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Biometric signin error:", error);
      res.status(400).json({ message: "Biometric authentication failed" });
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

      // In a real app, send OTP via email service
      console.log(`New OTP for ${user.email}: ${otpCode}`);

      res.json({ message: "OTP sent successfully" });
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
  
  // Get vendor posts
  app.get("/api/vendor-posts", async (req, res) => {
    try {
      const { limit = 20, offset = 0, vendorId, postType } = req.query;
      
      const posts = await storage.getVendorPosts({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        vendorId: vendorId ? parseInt(vendorId as string) : undefined,
        postType: postType as string
      });
      
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

  // Driver Dashboard API Endpoints
  app.get("/api/driver/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const driverProfile = await storage.getDriverProfile(req.user.id);
      res.json(driverProfile);
    } catch (error) {
      console.error("Get driver profile error:", error);
      res.status(500).json({ message: "Error fetching driver profile" });
    }
  });

  app.get("/api/driver/available-jobs", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'DRIVER') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const jobs = await storage.getAvailableDeliveryJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Get available jobs error:", error);
      res.status(500).json({ message: "Error fetching available jobs" });
    }
  });

  app.post("/api/driver/accept-job/:jobId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'DRIVER') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { jobId } = req.params;
      await storage.acceptDeliveryJob(jobId, req.user.id);
      res.json({ message: "Job accepted successfully" });
    } catch (error) {
      console.error("Accept job error:", error);
      res.status(500).json({ message: "Error accepting job" });
    }
  });

  app.get("/api/driver/earnings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'DRIVER') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const earnings = await storage.getDriverEarnings(req.user.id);
      res.json(earnings);
    } catch (error) {
      console.error("Get driver earnings error:", error);
      res.status(500).json({ message: "Error fetching earnings" });
    }
  });

  app.get("/api/driver/delivery-history", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'DRIVER') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
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
      
      // Generate unique ticket number
      const ticketNumber = `SP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const ticket = await storage.createSupportTicket({
        ...ticketData,
        ticketNumber
      });
      
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

  // Wallet API Endpoints
  app.get("/api/wallet", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      let wallet = await storage.getWallet(req.user.id);
      if (!wallet) {
        wallet = await storage.createWallet({
          userId: req.user.id,
          balance: 0,
          currency: 'USD'
        });
      }
      res.json(wallet);
    } catch (error) {
      console.error("Get wallet error:", error);
      res.status(500).json({ message: "Error fetching wallet" });
    }
  });

  app.post("/api/wallet/fund", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { amount, paymentMethodId } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      if (!paymentMethodId) {
        return res.status(400).json({ message: "Payment method required" });
      }
      
      const result = await storage.fundWallet(req.user.id, amount, paymentMethodId);
      
      if (result.success) {
        res.json({ 
          message: "Wallet funded successfully",
          transactionId: result.transactionId
        });
      } else {
        res.status(400).json({ 
          message: result.error || "Wallet funding failed"
        });
      }
    } catch (error) {
      console.error("Fund wallet error:", error);
      res.status(500).json({ message: "Error funding wallet" });
    }
  });

  app.get("/api/wallet/transactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { limit = 50, offset = 0 } = req.query;
      const transactions = await storage.getWalletTransactions(
        req.user.id, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      res.json(transactions);
    } catch (error) {
      console.error("Get wallet transactions error:", error);
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });

  // Payment Methods API Endpoints
  app.get("/api/payment-methods", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const paymentMethods = await storage.getPaymentMethods(req.user.id);
      res.json(paymentMethods);
    } catch (error) {
      console.error("Get payment methods error:", error);
      res.status(500).json({ message: "Error fetching payment methods" });
    }
  });

  app.post("/api/payment-methods", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { type, details, isDefault = false } = req.body;
      
      if (!type || !details) {
        return res.status(400).json({ message: "Payment method type and details required" });
      }
      
      const paymentMethod = await storage.createPaymentMethod({
        userId: req.user.id,
        type,
        details,
        isDefault
      });
      
      // If this is set as default, update other payment methods
      if (isDefault) {
        await storage.setDefaultPaymentMethod(req.user.id, paymentMethod.id);
      }
      
      res.json({ 
        message: "Payment method added successfully",
        paymentMethod
      });
    } catch (error) {
      console.error("Add payment method error:", error);
      res.status(500).json({ message: "Error adding payment method" });
    }
  });

  app.put("/api/payment-methods/:paymentMethodId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { paymentMethodId } = req.params;
      const updateData = req.body;
      
      const updatedMethod = await storage.updatePaymentMethod(
        parseInt(paymentMethodId), 
        updateData
      );
      
      // If setting as default, update other payment methods
      if (updateData.isDefault) {
        await storage.setDefaultPaymentMethod(req.user.id, parseInt(paymentMethodId));
      }
      
      res.json({ 
        message: "Payment method updated successfully",
        paymentMethod: updatedMethod
      });
    } catch (error) {
      console.error("Update payment method error:", error);
      res.status(500).json({ message: "Error updating payment method" });
    }
  });

  app.delete("/api/payment-methods/:paymentMethodId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { paymentMethodId } = req.params;
      await storage.deletePaymentMethod(parseInt(paymentMethodId));
      
      res.json({ message: "Payment method deleted successfully" });
    } catch (error) {
      console.error("Delete payment method error:", error);
      res.status(500).json({ message: "Error deleting payment method" });
    }
  });

  app.post("/api/payment-methods/:paymentMethodId/set-default", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { paymentMethodId } = req.params;
      await storage.setDefaultPaymentMethod(req.user.id, parseInt(paymentMethodId));
      
      res.json({ message: "Default payment method updated successfully" });
    } catch (error) {
      console.error("Set default payment method error:", error);
      res.status(500).json({ message: "Error setting default payment method" });
    }
  });

  // Payment Processing API Endpoint
  app.post("/api/payments/process", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { amount, paymentMethodId, description } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      if (!paymentMethodId) {
        return res.status(400).json({ message: "Payment method required" });
      }
      
      const result = await storage.processPayment(
        req.user.id, 
        amount, 
        paymentMethodId, 
        description || 'Payment'
      );
      
      if (result.success) {
        res.json({ 
          message: "Payment processed successfully",
          transactionId: result.transactionId
        });
      } else {
        res.status(400).json({ 
          message: result.error || "Payment processing failed"
        });
      }
    } catch (error) {
      console.error("Process payment error:", error);
      res.status(500).json({ message: "Error processing payment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
