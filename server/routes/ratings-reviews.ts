
import express from "express";
import { db } from "../db";
import { ratings, users, orders, products } from "../../shared/schema";
import { eq, desc, and, avg, count, sql } from "drizzle-orm";
import { authenticateUser, requireAuth } from "../middleware/auth";

const router = express.Router();

// Get ratings for a specific entity (driver, merchant, or product)
router.get("/", async (req, res) => {
  try {
    const { driverId, merchantId, productId, orderId } = req.query;

    let whereConditions = [];

    if (driverId) {
      whereConditions.push(eq(ratings.driverId, parseInt(driverId as string)));
    }
    if (merchantId) {
      whereConditions.push(eq(ratings.merchantId, parseInt(merchantId as string)));
    }
    if (productId) {
      whereConditions.push(eq(ratings.productId, productId as string));
    }
    if (orderId) {
      whereConditions.push(eq(ratings.orderId, parseInt(orderId as string)));
    }

    if (whereConditions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'At least one filter parameter is required' 
      });
    }

    const ratingsList = await db
      .select({
        id: ratings.id,
        rating: ratings.rating,
        comment: ratings.comment,
        createdAt: ratings.createdAt,
        customerName: users.fullName,
        orderId: ratings.orderId
      })
      .from(ratings)
      .leftJoin(users, eq(ratings.customerId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(ratings.createdAt));

    // Calculate average rating
    const [avgRating] = await db
      .select({
        average: avg(ratings.rating),
        total: count()
      })
      .from(ratings)
      .where(and(...whereConditions));

    res.json({
      success: true,
      data: {
        ratings: ratingsList,
        statistics: {
          averageRating: avgRating.average || 0,
          totalRatings: avgRating.total
        }
      }
    });
  } catch (error) {
    console.error('Ratings fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ratings' });
  }
});

// Create a new rating/review
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const {
      orderId,
      driverId,
      merchantId,
      productId,
      rating,
      comment
    } = req.body;

    if (!orderId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order ID and valid rating (1-5) are required' 
      });
    }

    // Verify the user can rate this order
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.customerId, userId),
        eq(orders.status, 'DELIVERED')
      ))
      .limit(1);

    if (!order) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order not found or not eligible for rating' 
      });
    }

    // Check if rating already exists
    const [existingRating] = await db
      .select()
      .from(ratings)
      .where(and(
        eq(ratings.orderId, orderId),
        eq(ratings.customerId, userId)
      ))
      .limit(1);

    if (existingRating) {
      return res.status(400).json({ 
        success: false, 
        error: 'You have already rated this order' 
      });
    }

    const [newRating] = await db.insert(ratings).values({
      customerId: userId,
      orderId,
      driverId: driverId || order.driverId,
      merchantId: merchantId || order.merchantId,
      productId,
      rating,
      comment,
      createdAt: new Date()
    }).returning();

    // Update average ratings for driver/merchant/product
    if (driverId || order.driverId) {
      await updateDriverRating(driverId || order.driverId);
    }

    if (merchantId || order.merchantId) {
      await updateMerchantRating(merchantId || order.merchantId);
    }

    if (productId) {
      await updateProductRating(productId);
    }

    res.status(201).json({
      success: true,
      data: newRating
    });
  } catch (error) {
    console.error('Rating creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create rating' });
  }
});

// Update rating/review
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid rating (1-5) is required' 
      });
    }

    const [updatedRating] = await db
      .update(ratings)
      .set({
        rating,
        comment
      })
      .where(and(
        eq(ratings.id, parseInt(id)),
        eq(ratings.customerId, userId)
      ))
      .returning();

    if (!updatedRating) {
      return res.status(404).json({ 
        success: false, 
        error: 'Rating not found or unauthorized' 
      });
    }

    // Update average ratings
    if (updatedRating.driverId) {
      await updateDriverRating(updatedRating.driverId);
    }
    if (updatedRating.merchantId) {
      await updateMerchantRating(updatedRating.merchantId);
    }
    if (updatedRating.productId) {
      await updateProductRating(updatedRating.productId);
    }

    res.json({
      success: true,
      data: updatedRating
    });
  } catch (error) {
    console.error('Rating update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update rating' });
  }
});

// Delete rating/review
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;

    const [rating] = await db
      .select()
      .from(ratings)
      .where(and(
        eq(ratings.id, parseInt(id)),
        eq(ratings.customerId, userId)
      ))
      .limit(1);

    if (!rating) {
      return res.status(404).json({ 
        success: false, 
        error: 'Rating not found or unauthorized' 
      });
    }

    await db
      .delete(ratings)
      .where(eq(ratings.id, parseInt(id)));

    // Update average ratings
    if (rating.driverId) {
      await updateDriverRating(rating.driverId);
    }
    if (rating.merchantId) {
      await updateMerchantRating(rating.merchantId);
    }
    if (rating.productId) {
      await updateProductRating(rating.productId);
    }

    res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    console.error('Rating deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete rating' });
  }
});

// Helper functions to update average ratings
async function updateDriverRating(driverId: number) {
  const [avgRating] = await db
    .select({
      average: avg(ratings.rating),
      total: count()
    })
    .from(ratings)
    .where(eq(ratings.driverId, driverId));

  await db
    .update(users)
    .set({
      // Assuming we add rating field to users table for drivers
      updatedAt: new Date()
    })
    .where(eq(users.id, driverId));
}

async function updateMerchantRating(merchantId: number) {
  const [avgRating] = await db
    .select({
      average: avg(ratings.rating),
      total: count()
    })
    .from(ratings)
    .where(eq(ratings.merchantId, merchantId));

  await db
    .update(users)
    .set({
      // Assuming we add rating field to users table for merchants
      updatedAt: new Date()
    })
    .where(eq(users.id, merchantId));
}

async function updateProductRating(productId: string) {
  const [avgRating] = await db
    .select({
      average: avg(ratings.rating),
      total: count()
    })
    .from(ratings)
    .where(eq(ratings.productId, productId));

  await db
    .update(products)
    .set({
      rating: avgRating.average?.toString() || '0',
      totalReviews: avgRating.total,
      updatedAt: new Date()
    })
    .where(eq(products.id, parseInt(productId)));
}

export const registerRatingsReviewsRoutes = (app: express.Application) => {
  app.use('/api/ratings', router);
};

export default router;
