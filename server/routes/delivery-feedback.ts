
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { ratings, orders, users, driverProfiles, deliveryFeedback } from '../../shared/schema';
import { eq, and, desc, avg, count, gte, sql } from 'drizzle-orm';

const router = Router();

// Validation schemas
const deliveryRatingSchema = z.object({
  orderId: z.string(),
  driverRating: z.number().min(1).max(5),
  serviceRating: z.number().min(1).max(5),
  deliveryTimeRating: z.number().min(1).max(5),
  comment: z.string().optional(),
  deliveryQuality: z.enum(['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR']),
  wouldRecommend: z.boolean(),
  issuesReported: z.array(z.string()).optional(),
  additionalFeedback: z.string().optional()
});

const driverFeedbackSchema = z.object({
  orderId: z.string(),
  customerRating: z.number().min(1).max(5),
  comment: z.string().optional(),
  deliveryComplexity: z.enum(['EASY', 'MODERATE', 'DIFFICULT']),
  customerCooperation: z.enum(['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR']),
  paymentIssues: z.boolean().optional(),
  additionalNotes: z.string().optional()
});

// Submit delivery rating by customer
router.post('/rate-delivery', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const validatedData = deliveryRatingSchema.parse(req.body);

    // Verify order ownership and completion
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, parseInt(validatedData.orderId)),
        eq(orders.customerId, userId),
        eq(orders.status, 'DELIVERED')
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not eligible for rating'
      });
    }

    // Check if already rated
    const [existingRating] = await db
      .select()
      .from(ratings)
      .where(and(
        eq(ratings.orderId, order.id),
        eq(ratings.customerId, userId)
      ))
      .limit(1);

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'Order already rated'
      });
    }

    // Calculate overall rating
    const overallRating = Math.round(
      (validatedData.driverRating + validatedData.serviceRating + validatedData.deliveryTimeRating) / 3
    );

    // Create rating record
    const [newRating] = await db.insert(ratings).values({
      customerId: userId,
      orderId: order.id,
      driverId: order.driverId,
      merchantId: order.merchantId,
      rating: overallRating,
      comment: validatedData.comment,
      createdAt: new Date()
    }).returning();

    // Create detailed feedback record
    await db.insert(deliveryFeedback).values({
      orderId: order.id,
      customerId: userId,
      driverId: order.driverId,
      driverRating: validatedData.driverRating,
      serviceRating: validatedData.serviceRating,
      deliveryTimeRating: validatedData.deliveryTimeRating,
      deliveryQuality: validatedData.deliveryQuality,
      wouldRecommend: validatedData.wouldRecommend,
      issuesReported: validatedData.issuesReported ? JSON.stringify(validatedData.issuesReported) : null,
      additionalFeedback: validatedData.additionalFeedback,
      feedbackType: 'CUSTOMER_TO_DRIVER',
      createdAt: new Date()
    });

    // Update driver's average rating
    await updateDriverAverageRating(order.driverId);

    // Send real-time notification to driver
    if (global.io) {
      global.io.to(`user_${order.driverId}`).emit('delivery_rated', {
        orderId: order.id,
        rating: overallRating,
        driverRating: validatedData.driverRating,
        serviceRating: validatedData.serviceRating,
        deliveryTimeRating: validatedData.deliveryTimeRating,
        comment: validatedData.comment,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      data: {
        rating: newRating,
        overallRating,
        message: 'Thank you for your feedback!'
      }
    });

  } catch (error: any) {
    console.error('Delivery rating error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback data',
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating'
    });
  }
});

// Submit feedback by driver about customer
router.post('/driver-feedback', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const validatedData = driverFeedbackSchema.parse(req.body);

    // Verify driver ownership of order
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, parseInt(validatedData.orderId)),
        eq(orders.driverId, userId),
        eq(orders.status, 'DELIVERED')
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not accessible'
      });
    }

    // Create driver feedback record
    await db.insert(deliveryFeedback).values({
      orderId: order.id,
      customerId: order.customerId,
      driverId: userId,
      customerRating: validatedData.customerRating,
      comment: validatedData.comment,
      deliveryComplexity: validatedData.deliveryComplexity,
      customerCooperation: validatedData.customerCooperation,
      paymentIssues: validatedData.paymentIssues || false,
      additionalFeedback: validatedData.additionalNotes,
      feedbackType: 'DRIVER_TO_CUSTOMER',
      createdAt: new Date()
    });

    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error: any) {
    console.error('Driver feedback error:', error);
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

// Get delivery feedback for an order
router.get('/order/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    // Get order to verify access
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, parseInt(orderId)))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify access
    if (order.customerId !== userId && order.driverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get all feedback for this order
    const feedback = await db
      .select({
        id: deliveryFeedback.id,
        driverRating: deliveryFeedback.driverRating,
        serviceRating: deliveryFeedback.serviceRating,
        deliveryTimeRating: deliveryFeedback.deliveryTimeRating,
        customerRating: deliveryFeedback.customerRating,
        comment: deliveryFeedback.comment,
        deliveryQuality: deliveryFeedback.deliveryQuality,
        wouldRecommend: deliveryFeedback.wouldRecommend,
        deliveryComplexity: deliveryFeedback.deliveryComplexity,
        customerCooperation: deliveryFeedback.customerCooperation,
        feedbackType: deliveryFeedback.feedbackType,
        createdAt: deliveryFeedback.createdAt,
        customerName: users.fullName
      })
      .from(deliveryFeedback)
      .leftJoin(users, eq(deliveryFeedback.customerId, users.id))
      .where(eq(deliveryFeedback.orderId, order.id))
      .orderBy(desc(deliveryFeedback.createdAt));

    res.json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback'
    });
  }
});

// Get driver's rating summary
router.get('/driver/:driverId/summary', async (req, res) => {
  try {
    const { driverId } = req.params;

    // Get rating statistics
    const [ratingStats] = await db
      .select({
        averageRating: avg(deliveryFeedback.driverRating),
        totalRatings: count(),
        fiveStars: count(sql`case when ${deliveryFeedback.driverRating} = 5 then 1 end`),
        fourStars: count(sql`case when ${deliveryFeedback.driverRating} = 4 then 1 end`),
        threeStars: count(sql`case when ${deliveryFeedback.driverRating} = 3 then 1 end`),
        twoStars: count(sql`case when ${deliveryFeedback.driverRating} = 2 then 1 end`),
        oneStar: count(sql`case when ${deliveryFeedback.driverRating} = 1 then 1 end`)
      })
      .from(deliveryFeedback)
      .where(and(
        eq(deliveryFeedback.driverId, parseInt(driverId)),
        eq(deliveryFeedback.feedbackType, 'CUSTOMER_TO_DRIVER')
      ));

    // Get service quality statistics
    const [serviceStats] = await db
      .select({
        averageServiceRating: avg(deliveryFeedback.serviceRating),
        averageTimeRating: avg(deliveryFeedback.deliveryTimeRating),
        recommendationRate: sql<number>`
          ROUND(
            (COUNT(CASE WHEN ${deliveryFeedback.wouldRecommend} = true THEN 1 END) * 100.0 / COUNT(*)),
            1
          )
        `
      })
      .from(deliveryFeedback)
      .where(and(
        eq(deliveryFeedback.driverId, parseInt(driverId)),
        eq(deliveryFeedback.feedbackType, 'CUSTOMER_TO_DRIVER')
      ));

    // Get recent reviews
    const recentReviews = await db
      .select({
        rating: deliveryFeedback.driverRating,
        comment: deliveryFeedback.comment,
        deliveryQuality: deliveryFeedback.deliveryQuality,
        createdAt: deliveryFeedback.createdAt,
        customerName: users.fullName
      })
      .from(deliveryFeedback)
      .leftJoin(users, eq(deliveryFeedback.customerId, users.id))
      .where(and(
        eq(deliveryFeedback.driverId, parseInt(driverId)),
        eq(deliveryFeedback.feedbackType, 'CUSTOMER_TO_DRIVER')
      ))
      .orderBy(desc(deliveryFeedback.createdAt))
      .limit(10);

    res.json({
      success: true,
      data: {
        ratings: {
          average: Number(ratingStats?.averageRating || 0),
          total: Number(ratingStats?.totalRatings || 0),
          distribution: {
            5: Number(ratingStats?.fiveStars || 0),
            4: Number(ratingStats?.fourStars || 0),
            3: Number(ratingStats?.threeStars || 0),
            2: Number(ratingStats?.twoStars || 0),
            1: Number(ratingStats?.oneStar || 0)
          }
        },
        service: {
          averageServiceRating: Number(serviceStats?.averageServiceRating || 0),
          averageTimeRating: Number(serviceStats?.averageTimeRating || 0),
          recommendationRate: Number(serviceStats?.recommendationRate || 0)
        },
        recentReviews
      }
    });

  } catch (error) {
    console.error('Get driver summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver rating summary'
    });
  }
});

// Request rating reminder
router.post('/remind-rating/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, parseInt(orderId)),
        eq(orders.status, 'DELIVERED')
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if already rated
    const [existingRating] = await db
      .select()
      .from(ratings)
      .where(and(
        eq(ratings.orderId, order.id),
        eq(ratings.customerId, order.customerId)
      ))
      .limit(1);

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'Order already rated'
      });
    }

    // Send rating reminder
    if (global.io) {
      global.io.to(`user_${order.customerId}`).emit('rating_reminder', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        driverId: order.driverId,
        deliveredAt: order.deliveredAt,
        message: 'Please rate your recent delivery experience',
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: 'Rating reminder sent'
    });

  } catch (error) {
    console.error('Rating reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminder'
    });
  }
});

// Helper function to update driver's average rating
async function updateDriverAverageRating(driverId: number) {
  try {
    const [avgRating] = await db
      .select({
        average: avg(deliveryFeedback.driverRating),
        total: count()
      })
      .from(deliveryFeedback)
      .where(and(
        eq(deliveryFeedback.driverId, driverId),
        eq(deliveryFeedback.feedbackType, 'CUSTOMER_TO_DRIVER')
      ));

    await db
      .update(driverProfiles)
      .set({
        rating: Number(avgRating?.average || 0),
        totalRatings: Number(avgRating?.total || 0),
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, driverId));

  } catch (error) {
    console.error('Update driver rating error:', error);
  }
}

export default router;
