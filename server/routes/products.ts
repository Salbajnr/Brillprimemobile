
import express from "express";
import { db } from "../db";
import { products, categories, users } from "../../shared/schema";
import { eq, desc, and, like, gte, lte, count, sql } from "drizzle-orm";
import { authenticateUser, requireAuth } from "../middleware/auth";

const router = express.Router();

// Get all products with filtering and pagination
router.get("/", async (req, res) => {
  try {
    const { 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      merchantId,
      page = 1, 
      limit = 20 
    } = req.query;

    let whereConditions = [eq(products.isAvailable, true)];

    if (category) {
      whereConditions.push(eq(products.category, category as string));
    }

    if (search) {
      whereConditions.push(like(products.name, `%${search}%`));
    }

    if (minPrice) {
      whereConditions.push(gte(products.price, minPrice as string));
    }

    if (maxPrice) {
      whereConditions.push(lte(products.price, maxPrice as string));
    }

    if (merchantId) {
      whereConditions.push(eq(products.merchantId, parseInt(merchantId as string)));
    }

    const productsList = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        category: products.category,
        unit: products.unit,
        stockQuantity: products.stockQuantity,
        imageUrl: products.imageUrl,
        rating: products.rating,
        totalReviews: products.totalReviews,
        merchantName: users.fullName
      })
      .from(products)
      .leftJoin(users, eq(products.merchantId, users.id))
      .where(and(...whereConditions))
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string))
      .orderBy(desc(products.createdAt));

    const [totalCount] = await db
      .select({ count: count() })
      .from(products)
      .where(and(...whereConditions));

    res.json({
      success: true,
      data: {
        products: productsList,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        category: products.category,
        unit: products.unit,
        stockQuantity: products.stockQuantity,
        imageUrl: products.imageUrl,
        images: products.images,
        rating: products.rating,
        totalReviews: products.totalReviews,
        merchantId: products.merchantId,
        merchantName: users.fullName,
        createdAt: products.createdAt
      })
      .from(products)
      .leftJoin(users, eq(products.merchantId, users.id))
      .where(eq(products.id, parseInt(id)))
      .limit(1);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// Create new product (merchants only)
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    if (userRole !== 'MERCHANT') {
      return res.status(403).json({ success: false, error: 'Only merchants can create products' });
    }

    const {
      name,
      description,
      price,
      category,
      unit,
      stockQuantity = 0,
      imageUrl,
      images = []
    } = req.body;

    if (!name || !price || !category || !unit) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, price, category, and unit are required' 
      });
    }

    const [newProduct] = await db.insert(products).values({
      merchantId: userId,
      sellerId: userId,
      name,
      description,
      price: price.toString(),
      category,
      unit,
      stockQuantity,
      stockLevel: stockQuantity,
      imageUrl,
      images: JSON.stringify(images),
      isAvailable: true,
      createdAt: new Date()
    }).returning();

    res.status(201).json({
      success: true,
      data: newProduct
    });
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

// Update product (merchants only)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    if (userRole !== 'MERCHANT') {
      return res.status(403).json({ success: false, error: 'Only merchants can update products' });
    }

    const {
      name,
      description,
      price,
      category,
      unit,
      stockQuantity,
      imageUrl,
      images,
      isAvailable
    } = req.body;

    const updateData: any = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price.toString();
    if (category !== undefined) updateData.category = category;
    if (unit !== undefined) updateData.unit = unit;
    if (stockQuantity !== undefined) {
      updateData.stockQuantity = stockQuantity;
      updateData.stockLevel = stockQuantity;
    }
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (images !== undefined) updateData.images = JSON.stringify(images);
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(and(
        eq(products.id, parseInt(id)),
        eq(products.merchantId, userId)
      ))
      .returning();

    if (!updatedProduct) {
      return res.status(404).json({ success: false, error: 'Product not found or unauthorized' });
    }

    res.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// Delete product (merchants only)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    if (userRole !== 'MERCHANT') {
      return res.status(403).json({ success: false, error: 'Only merchants can delete products' });
    }

    const [deletedProduct] = await db
      .update(products)
      .set({
        isAvailable: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(products.id, parseInt(id)),
        eq(products.merchantId, userId)
      ))
      .returning();

    if (!deletedProduct) {
      return res.status(404).json({ success: false, error: 'Product not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Product deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

export const registerProductRoutes = (app: express.Application) => {
  app.use('/api/products', router);
};

export default router;
