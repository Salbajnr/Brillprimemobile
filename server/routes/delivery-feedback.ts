import { Router } from 'express';
import { db } from '../db';
import { orders, ratings, driverProfiles, users, transactions } from '../../shared/schema';
import { eq, and, desc, avg, count, sql } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Validation schemas
const feedbackSchema = z.object({
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  categories: z.object({
    punctuality: z.number().int().min(1).max(5).optional(),
    professionalism: z.number().int().min(1).max(5).optional(),
    communication: z.number().int().min(1).max(5).optional(),
    vehicle_condition: z.number().int().min(1).max(5).optional(),
    overall: z.number().int().min(1).max(5)
  }).optional()
});

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

// Submit delivery feedback
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const validatedData = feedbackSchema.parse(req.body);

    // Get order details
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, parseInt(validatedData.orderId)))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify user is the customer
    if (order.customerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the customer can provide feedback'
      });
    }

    // Verify order is delivered
    if (order.status !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be provided for delivered orders'
      });
    }

    // Check if feedback already exists
    const [existingFeedback] = await db.select()
      .from(ratings)
      .where(and(
        eq(ratings.orderId, order.id),
        eq(ratings.customerId, userId)
      ))
      .limit(1);

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this order'
      });
    }

    // Create feedback record
    const [feedback] = await db.insert(ratings).values({
      orderId: order.id,
      customerId: userId,
      driverId: order.driverId!,
      rating: validatedData.rating,
      comment: validatedData.comment,
      categories: validatedData.categories ? JSON.stringify(validatedData.categories) : null,
      createdAt: new Date()
    }).returning();

    // Update driver's average rating
    const [driverStats] = await db.select({
      avgRating: avg(ratings.rating),
      totalRatings: count(ratings.id)
    })
    .from(ratings)
    .where(eq(ratings.driverId, order.driverId!));

    await db.update(driverProfiles)
      .set({
        rating: Number(driverStats.avgRating || 0),
        totalRatings: driverStats.totalRatings || 0,
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, order.driverId!));

    // Award bonus for high ratings (4+ stars)
    if (validatedData.rating >= 4) {
      const bonusAmount = validatedData.rating === 5 ? 100 : 50; // ₦100 for 5 stars, ₦50 for 4 stars

      await db.insert(transactions).values({
        userId: order.driverId!,
        orderId: order.id,
        amount: bonusAmount.toString(),
        type: 'RATING_BONUS',
        status: 'COMPLETED',
        paymentMethod: 'wallet',
        paymentStatus: 'COMPLETED',
        transactionRef: `bonus_${Date.now()}_${order.driverId}`,
        description: `Rating bonus for ${validatedData.rating}-star delivery`,
        createdAt: new Date()
      });

      // Update driver earnings
      await db.update(driverProfiles)
        .set({
          totalEarnings: sql`${driverProfiles.totalEarnings} + ${bonusAmount}`,
          updatedAt: new Date()
        })
        .where(eq(driverProfiles.userId, order.driverId!));
    }

    // Real-time notifications
    if (global.io) {
      // Notify driver
      global.io.to(`user_${order.driverId}`).emit('delivery_feedback_received', {
        orderId: order.id,
        customerId: userId,
        rating: validatedData.rating,
        comment: validatedData.comment,
        bonus: validatedData.rating >= 4 ? (validatedData.rating === 5 ? 100 : 50) : 0,
        timestamp: new Date().toISOString()
      });

      // Update admin dashboard
      global.io.to('admin_feedback').emit('new_feedback', {
        feedbackId: feedback.id,
        orderId: order.id,
        driverId: order.driverId,
        rating: validatedData.rating,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Delivery feedback submitted successfully',
      feedback: {
        id: feedback.id,
        rating: feedback.rating,
        comment: feedback.comment,
        bonus: validatedData.rating >= 4 ? (validatedData.rating === 5 ? 100 : 50) : 0
      }
    });

  } catch (error: any) {
    console.error('Submit feedback error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback data',
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
});

// Get feedback for an order
router.get('/order/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session!.userId!;

    const [feedback] = await db.select({
      id: ratings.id,
      rating: ratings.rating,
      comment: ratings.comment,
      categories: ratings.categories,
      createdAt: ratings.createdAt,
      customerName: users.fullName
    })
    .from(ratings)
    .leftJoin(users, eq(ratings.customerId, users.id))
    .where(eq(ratings.orderId, parseInt(orderId)))
    .limit(1);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'No feedback found for this order'
      });
    }

    res.json({
      success: true,
      feedback: {
        ...feedback,
        categories: feedback.categories ? JSON.parse(feedback.categories) : null
      }
    });

  } catch (error: any) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback'
    });
  }
});

// Get driver's feedback summary
router.get('/driver/:driverId/summary', requireAuth, async (req, res) => {
  try {
    const { driverId } = req.params;

    const [summary] = await db.select({
      averageRating: avg(ratings.rating),
      totalRatings: count(ratings.id),
      fiveStars: sql<number>`COUNT(CASE WHEN ${ratings.rating} = 5 THEN 1 END)`,
      fourStars: sql<number>`COUNT(CASE WHEN ${ratings.rating} = 4 THEN 1 END)`,
      threeStars: sql<number>`COUNT(CASE WHEN ${ratings.rating} = 3 THEN 1 END)`,
      twoStars: sql<number>`COUNT(CASE WHEN ${ratings.rating} = 2 THEN 1 END)`,
      oneStar: sql<number>`COUNT(CASE WHEN ${ratings.rating} = 1 THEN 1 END)`
    })
    .from(ratings)
    .where(eq(ratings.driverId, parseInt(driverId)));

    // Get recent feedback
    const recentFeedback = await db.select({
      rating: ratings.rating,
      comment: ratings.comment,
      createdAt: ratings.createdAt,
      orderNumber: orders.orderNumber
    })
    .from(ratings)
    .leftJoin(orders, eq(ratings.orderId, orders.id))
    .where(eq(ratings.driverId, parseInt(driverId)))
    .orderBy(desc(ratings.createdAt))
    .limit(10);

    res.json({
      success: true,
      summary: {
        averageRating: Number(summary.averageRating || 0),
        totalRatings: summary.totalRatings || 0,
        distribution: {
          5: summary.fiveStars || 0,
          4: summary.fourStars || 0,
          3: summary.threeStars || 0,
          2: summary.twoStars || 0,
          1: summary.oneStar || 0
        }
      },
      recentFeedback
    });

  } catch (error: any) {
    console.error('Get driver feedback summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback summary'
    });
  }
});

export default router;