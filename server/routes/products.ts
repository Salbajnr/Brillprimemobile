import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import { insertProductSchema, products } from "../../shared/schema";

// Validation schemas
const createProductSchema = insertProductSchema.extend({
  name: z.string().min(1, "Product name is required").max(200, "Product name too long"),
  description: z.string().min(1, "Description is required").max(1000, "Description too long"),
  price: z.number().positive("Price must be positive"),
  unit: z.string().min(1, "Unit is required"),
  categoryId: z.number().positive("Category ID is required"),
  image: z.string().url().optional(),
  minimumOrder: z.number().positive().optional().default(1),
  inStock: z.boolean().optional().default(true)
});

const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid()
});

const productFiltersSchema = z.object({
  categoryId: z.string().optional(),
  sellerId: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  inStock: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  sortBy: z.enum(['name', 'price', 'rating', 'recent']).optional().default('recent')
});

export function registerProductRoutes(app: Express) {
  // Create a new product (Merchant only)
  app.post("/api/products", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const user = await storage.getUserById(userId);
      
      if (!user || user.role !== 'MERCHANT') {
        return res.status(403).json({
          success: false,
          message: "Only merchants can create products"
        });
      }

      const validatedData = createProductSchema.parse(req.body);
      
      const product = await storage.createProduct({
        ...validatedData,
        sellerId: userId,
        price: validatedData.price.toString()
      });

      // Create an automatic "NEW_PRODUCT" post in vendor feed
      try {
        await storage.createVendorPost({
          vendorId: userId,
          title: `New Product: ${product.name}`,
          content: `Check out our latest product: ${product.description}`,
          postType: "NEW_PRODUCT",
          productId: product.id,
          originalPrice: validatedData.price.toString(),
          images: product.image ? [product.image] : undefined
        });
      } catch (postError) {
        console.warn("Failed to create automatic post for new product:", postError);
      }

      // Real-time notification
      if ((global as any).io) {
        (global as any).io.emit('new_product', {
          type: 'NEW_PRODUCT',
          sellerId: userId,
          productId: product.id,
          productName: product.name,
          price: product.price,
          timestamp: Date.now()
        });
      }

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        product
      });
    } catch (error: any) {
      console.error("Create product error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Invalid product data",
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to create product"
      });
    }
  });

  // Get products with filtering and pagination
  app.get("/api/products", async (req, res) => {
    try {
      const filters = productFiltersSchema.parse(req.query);
      
      const products = await storage.getProducts({
        categoryId: filters.categoryId ? parseInt(filters.categoryId) : undefined,
        sellerId: filters.sellerId ? parseInt(filters.sellerId) : undefined,
        minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
        inStock: filters.inStock === 'true' ? true : filters.inStock === 'false' ? false : undefined,
        search: filters.search,
        page: parseInt(filters.page),
        limit: parseInt(filters.limit),
        sortBy: filters.sortBy
      });

      res.json({
        success: true,
        products: products.products,
        pagination: products.pagination
      });
    } catch (error: any) {
      console.error("Get products error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Invalid filter parameters",
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to fetch products"
      });
    }
  });

  // Get single product with details
  app.get("/api/products/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      const product = await storage.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      res.json({
        success: true,
        product
      });
    } catch (error) {
      console.error("Get product error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch product"
      });
    }
  });

  // Update product (Merchant only - own products)
  app.put("/api/products/:productId", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { productId } = req.params;
      
      // Verify ownership
      const existingProduct = await storage.getProductById(productId);
      if (!existingProduct || existingProduct.sellerId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only edit your own products"
        });
      }

      const validatedData = updateProductSchema.parse({ ...req.body, id: productId });
      const updatedProduct = await storage.updateProduct(productId, {
        ...validatedData,
        price: validatedData.price?.toString()
      });

      // Create update post if significant changes
      if (validatedData.price && validatedData.price !== parseFloat(existingProduct.price)) {
        try {
          await storage.createVendorPost({
            vendorId: userId,
            title: `Price Update: ${updatedProduct.name}`,
            content: `We've updated the price for ${updatedProduct.name}. Check it out!`,
            postType: "PRODUCT_UPDATE",
            productId: productId,
            originalPrice: validatedData.price.toString()
          });
        } catch (postError) {
          console.warn("Failed to create automatic post for product update:", postError);
        }
      }

      res.json({
        success: true,
        message: "Product updated successfully",
        product: updatedProduct
      });
    } catch (error: any) {
      console.error("Update product error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Invalid product data",
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to update product"
      });
    }
  });

  // Delete product (Merchant only - own products)
  app.delete("/api/products/:productId", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { productId } = req.params;

      // Verify ownership
      const product = await storage.getProductById(productId);
      if (!product || product.sellerId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own products"
        });
      }

      await storage.deleteProduct(productId);

      res.json({
        success: true,
        message: "Product deleted successfully"
      });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete product"
      });
    }
  });

  // Toggle product stock status
  app.patch("/api/products/:productId/stock", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { productId } = req.params;
      const { inStock } = z.object({ inStock: z.boolean() }).parse(req.body);

      // Verify ownership
      const product = await storage.getProductById(productId);
      if (!product || product.sellerId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only modify your own products"
        });
      }

      const updatedProduct = await storage.updateProduct(productId, { inStock });

      // Create restock post if product is back in stock
      if (inStock && !product.inStock) {
        try {
          await storage.createVendorPost({
            vendorId: userId,
            title: `Back in Stock: ${product.name}`,
            content: `Great news! ${product.name} is back in stock. Order now!`,
            postType: "RESTOCK",
            productId: productId,
            originalPrice: product.price
          });
        } catch (postError) {
          console.warn("Failed to create restock post:", postError);
        }
      }

      res.json({
        success: true,
        message: `Product marked as ${inStock ? 'in stock' : 'out of stock'}`,
        product: updatedProduct
      });
    } catch (error: any) {
      console.error("Update stock error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Invalid stock data",
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to update stock status"
      });
    }
  });

  // Get merchant's own products
  app.get("/api/merchant/products", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const user = await storage.getUserById(userId);
      
      if (!user || user.role !== 'MERCHANT') {
        return res.status(403).json({
          success: false,
          message: "Only merchants can view their products"
        });
      }

      const { page = '1', limit = '20', sortBy = 'recent' } = req.query;

      const products = await storage.getProducts({
        sellerId: userId,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string
      });

      res.json({
        success: true,
        products: products.products,
        pagination: products.pagination
      });
    } catch (error) {
      console.error("Get merchant products error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch your products"
      });
    }
  });

  // Get product analytics for merchants
  app.get("/api/merchant/products/analytics", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const user = await storage.getUserById(userId);
      
      if (!user || user.role !== 'MERCHANT') {
        return res.status(403).json({
          success: false,
          message: "Only merchants can view product analytics"
        });
      }

      const analytics = await storage.getProductAnalytics(userId);

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error("Get product analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics"
      });
    }
  });
}