
import type { Express } from "express";
import { z } from "zod";
import { db } from "../db";
import { reviews, users, merchantProfiles, driverProfiles, fuelOrders } from "@shared/schema";
import { eq, and, desc, avg, count, sql } from "drizzle-orm";

const createReviewSchema = z.object({
  revieweeId: z.number(),
  revieweeType: z.enum(["MERCHANT", "DRIVER"]),
  orderId: z.string().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().optional(),
});

export function registerRatingsReviewsRoutes(app: Express) {
  // Create a review
  app.post("/api/reviews", async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const validatedData = createReviewSchema.parse(req.body);

      // Check if user has completed an order with this merchant/driver
      if (validatedData.orderId) {
        const order = await db
          .select()
          .from(fuelOrders)
          .where(and(
            eq(fuelOrders.id, validatedData.orderId),
            eq(fuelOrders.status, 'DELIVERED')
          ))
          .limit(1);

        if (!order.length) {
          return res.status(400).json({ 
            success: false, 
            error: 'Can only review completed orders' 
          });
        }

        const orderData = order[0];
        
        // Verify user is part of this order
        if (validatedData.revieweeType === 'MERCHANT') {
          if (orderData.customerId !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
          }
        } else if (validatedData.revieweeType === 'DRIVER') {
          if (orderData.customerId !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
          }
          if (orderData.driverId !== validatedData.revieweeId) {
            return res.status(400).json({ success: false, error: 'Invalid driver for this order' });
          }
        }
      }

      // Check if review already exists
      const existingReview = await db
        .select()
        .from(reviews)
        .where(and(
          eq(reviews.reviewerId, userId),
          eq(reviews.revieweeId, validatedData.revieweeId),
          validatedData.orderId ? eq(reviews.orderId, validatedData.orderId) : sql`order_id IS NULL`
        ))
        .limit(1);

      if (existingReview.length) {
        return res.status(400).json({ 
          success: false, 
          error: 'Review already exists for this order' 
        });
      }

      // Create review
      const [newReview] = await db.insert(reviews).values({
        reviewerId: userId,
        revieweeId: validatedData.revieweeId,
        revieweeType: validatedData.revieweeType,
        orderId: validatedData.orderId,
        rating: validatedData.rating,
        comment: validatedData.comment,
        isVerified: !!validatedData.orderId
      }).returning();

      // Update average rating
      await updateAverageRating(validatedData.revieweeId, validatedData.revieweeType);

      // Real-time notification
      if (global.io) {
        const reviewer = await db
          .select({ fullName: users.fullName })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        global.io.to(`user_${validatedData.revieweeId}`).emit('new_review', {
          type: 'NEW_REVIEW',
          review: newReview,
          reviewerName: reviewer[0]?.fullName || 'Anonymous',
          message: `You received a ${validatedData.rating}-star review`,
          timestamp: Date.now()
        });

        // Broadcast to admin monitoring
        global.io.to('admin_monitoring').emit('review_activity', {
          type: 'REVIEW_CREATED',
          review: newReview,
          reviewerName: reviewer[0]?.fullName,
          timestamp: Date.now()
        });
      }

      res.json({ success: true, review: newReview });
    } catch (error: any) {
      console.error('Error creating review:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid request data', 
          details: error.errors 
        });
      }
      res.status(500).json({ success: false, error: 'Failed to create review' });
    }
  });

  // Get reviews for a user (merchant/driver)
  app.get("/api/reviews/:userId", async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, type } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereConditions = [eq(reviews.revieweeId, parseInt(userId))];
      if (type) {
        whereConditions.push(eq(reviews.revieweeType, type.toUpperCase()));
      }

      const userReviews = await db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          isVerified: reviews.isVerified,
          createdAt: reviews.createdAt,
          reviewerName: users.fullName,
          reviewerProfilePicture: users.profilePicture,
          orderId: reviews.orderId
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.reviewerId, users.id))
        .where(and(...whereConditions, eq(reviews.isPublic, true)))
        .orderBy(desc(reviews.createdAt))
        .limit(parseInt(limit))
        .offset(offset);

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(reviews)
        .where(and(...whereConditions, eq(reviews.isPublic, true)));

      // Get rating distribution
      const ratingDistribution = await db
        .select({
          rating: reviews.rating,
          count: count()
        })
        .from(reviews)
        .where(and(...whereConditions, eq(reviews.isPublic, true)))
        .groupBy(reviews.rating)
        .orderBy(reviews.rating);

      // Get average rating
      const [{ avgRating }] = await db
        .select({ avgRating: avg(reviews.rating) })
        .from(reviews)
        .where(and(...whereConditions, eq(reviews.isPublic, true)));

      res.json({
        success: true,
        reviews: userReviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages: Math.ceil(parseInt(total) / parseInt(limit))
        },
        statistics: {
          averageRating: parseFloat(avgRating || '0'),
          totalReviews: parseInt(total),
          ratingDistribution: ratingDistribution.reduce((acc, item) => {
            acc[item.rating] = parseInt(item.count);
            return acc;
          }, {} as Record<number, number>)
        }
      });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
    }
  });

  // Update a review
  app.put("/api/reviews/:reviewId", async (req: any, res: any) => {
    try {
      const { reviewId } = req.params;
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const validatedData = updateReviewSchema.parse(req.body);

      // Check if user owns this review
      const review = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, parseInt(reviewId)))
        .limit(1);

      if (!review.length) {
        return res.status(404).json({ success: false, error: 'Review not found' });
      }

      if (review[0].reviewerId !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Update review
      const [updatedReview] = await db
        .update(reviews)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(reviews.id, parseInt(reviewId)))
        .returning();

      // Update average rating
      await updateAverageRating(review[0].revieweeId, review[0].revieweeType);

      // Real-time notification
      if (global.io && validatedData.rating) {
        global.io.to(`user_${review[0].revieweeId}`).emit('review_updated', {
          type: 'REVIEW_UPDATED',
          review: updatedReview,
          message: 'A review about you has been updated',
          timestamp: Date.now()
        });
      }

      res.json({ success: true, review: updatedReview });
    } catch (error: any) {
      console.error('Error updating review:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid request data', 
          details: error.errors 
        });
      }
      res.status(500).json({ success: false, error: 'Failed to update review' });
    }
  });

  // Delete a review
  app.delete("/api/reviews/:reviewId", async (req: any, res: any) => {
    try {
      const { reviewId } = req.params;
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      // Check if user owns this review
      const review = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, parseInt(reviewId)))
        .limit(1);

      if (!review.length) {
        return res.status(404).json({ success: false, error: 'Review not found' });
      }

      if (review[0].reviewerId !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Delete review
      await db
        .delete(reviews)
        .where(eq(reviews.id, parseInt(reviewId)));

      // Update average rating
      await updateAverageRating(review[0].revieweeId, review[0].revieweeType);

      res.json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(500).json({ success: false, error: 'Failed to delete review' });
    }
  });

  // Get user's given reviews
  app.get("/api/reviews/given", async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const givenReviews = await db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          revieweeType: reviews.revieweeType,
          createdAt: reviews.createdAt,
          revieweeName: users.fullName,
          revieweeProfilePicture: users.profilePicture,
          orderId: reviews.orderId
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.revieweeId, users.id))
        .where(eq(reviews.reviewerId, userId))
        .orderBy(desc(reviews.createdAt))
        .limit(parseInt(limit))
        .offset(offset);

      res.json({ success: true, reviews: givenReviews });
    } catch (error) {
      console.error('Error fetching given reviews:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch given reviews' });
    }
  });
}

// Helper function to update average rating
async function updateAverageRating(userId: number, userType: 'MERCHANT' | 'DRIVER') {
  try {
    const [{ avgRating, totalReviews }] = await db
      .select({ 
        avgRating: avg(reviews.rating),
        totalReviews: count()
      })
      .from(reviews)
      .where(and(
        eq(reviews.revieweeId, userId),
        eq(reviews.revieweeType, userType)
      ));

    if (userType === 'MERCHANT') {
      await db
        .update(merchantProfiles)
        .set({
          averageRating: avgRating || '0',
          totalReviews: parseInt(totalReviews),
          updatedAt: new Date()
        })
        .where(eq(merchantProfiles.userId, userId));
    } else if (userType === 'DRIVER') {
      await db
        .update(driverProfiles)
        .set({
          averageRating: avgRating || '0',
          totalReviews: parseInt(totalReviews),
          updatedAt: new Date()
        })
        .where(eq(driverProfiles.userId, userId));
    }
  } catch (error) {
    console.error('Error updating average rating:', error);
  }
}
