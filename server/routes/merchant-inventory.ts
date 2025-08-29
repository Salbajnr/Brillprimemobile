
import express from 'express';
import { db } from '../db';
import { products, orders, users } from '../../shared/schema';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string().min(1),
  stockQuantity: z.number().min(0),
  unit: z.string().min(1),
  imageUrl: z.string().url().optional()
});

const updateProductSchema = productSchema.partial();

// Get merchant inventory
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    const { category, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = db.select().from(products).where(eq(products.merchantId, userId));

    if (category) {
      query = query.where(eq(products.category, category as string));
    }

    const inventory = await query
      .orderBy(desc(products.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Get low stock alerts
    const lowStockItems = await db
      .select()
      .from(products)
      .where(and(
        eq(products.merchantId, userId),
        sql`stock_quantity <= 10`
      ));

    res.json({
      success: true,
      data: {
        products: inventory,
        lowStockAlerts: lowStockItems.length,
        lowStockItems: lowStockItems
      }
    });
  } catch (error) {
    console.error('Merchant inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Add new product
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    const validatedData = productSchema.parse(req.body);

    const [newProduct] = await db.insert(products).values({
      ...validatedData,
      merchantId: userId,
      price: validatedData.price.toString(),
      isAvailable: true,
      createdAt: new Date()
    }).returning();

    res.json({
      success: true,
      data: newProduct
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Update product
router.put('/:productId', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { productId } = req.params;

    if (!userId || userRole !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    const validatedData = updateProductSchema.parse(req.body);

    // Verify product ownership
    const [product] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.merchantId, userId)
      ))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    };

    if (validatedData.price) {
      updateData.price = validatedData.price.toString();
    }

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, productId))
      .returning();

    res.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:productId', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { productId } = req.params;

    if (!userId || userRole !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    // Verify product ownership
    const [product] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.merchantId, userId)
      ))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await db
      .delete(products)
      .where(eq(products.id, productId));

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get inventory analytics
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'MERCHANT') {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    // Total products
    const [totalProducts] = await db
      .select({ count: sql`count(*)` })
      .from(products)
      .where(eq(products.merchantId, userId));

    // Low stock products
    const [lowStockCount] = await db
      .select({ count: sql`count(*)` })
      .from(products)
      .where(and(
        eq(products.merchantId, userId),
        sql`stock_quantity <= 10`
      ));

    // Out of stock products
    const [outOfStockCount] = await db
      .select({ count: sql`count(*)` })
      .from(products)
      .where(and(
        eq(products.merchantId, userId),
        eq(products.stockQuantity, 0)
      ));

    // Top selling products (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topProducts = await db
      .select({
        productName: products.name,
        totalSold: sql`count(orders.id)`,
        revenue: sql`sum(cast(orders.total_amount as decimal))`
      })
      .from(products)
      .leftJoin(orders, eq(orders.sellerId, userId))
      .where(and(
        eq(products.merchantId, userId),
        gte(orders.createdAt, thirtyDaysAgo)
      ))
      .groupBy(products.id, products.name)
      .orderBy(sql`count(orders.id) desc`)
      .limit(5);

    res.json({
      success: true,
      data: {
        totalProducts: Number(totalProducts.count),
        lowStockCount: Number(lowStockCount.count),
        outOfStockCount: Number(outOfStockCount.count),
        topProducts: topProducts.map(product => ({
          name: product.productName,
          totalSold: Number(product.totalSold),
          revenue: Number(product.revenue || 0)
        }))
      }
    });
  } catch (error) {
    console.error('Inventory analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory analytics' });
  }
});

export default router;
