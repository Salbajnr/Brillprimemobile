import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, signInSchema, otpVerificationSchema, insertCategorySchema, insertProductSchema, insertUserLocationSchema, insertCartItemSchema, insertVendorPostSchema } from "@shared/schema";
import bcrypt from "bcrypt";

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

      res.json({ 
        message: "Social login successful",
        user: {
          id: user.id,
          userId: user.userId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture
        }
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

      // In a real app, create JWT token here
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ 
        message: "Login successful",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Signin error:", error);
      res.status(400).json({ message: "Invalid login data" });
    }
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
  
  // Get conversations for user
  app.get("/api/conversations", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const conversations = await storage.getConversations(parseInt(userId as string));
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

  const httpServer = createServer(app);
  return httpServer;
}
