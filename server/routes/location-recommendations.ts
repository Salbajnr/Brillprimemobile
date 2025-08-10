import type { Express } from "express";
import { z } from "zod";
import { db } from "../db";
import { merchantProfiles, users, locationRecommendations, reviews } from "../../shared/schema";
import { eq, and, desc, sql, avg, count, lt, gt } from "drizzle-orm";

const getRecommendationsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(100).max(50000).default(10000), // 100m to 50km
  category: z.string().min(1).max(50).optional(),
  minRating: z.number().min(0).max(5).optional(),
  sortBy: z.enum(['distance', 'rating', 'reviews']).default('distance'),
});

const trackInteractionSchema = z.object({
  merchantId: z.number(),
  interactionType: z.enum(['view', 'click', 'order']),
  latitude: z.number(),
  longitude: z.number(),
});

export function registerLocationRecommendationsRoutes(app: Express) {
  // Get location-based merchant recommendations
  app.post("/api/recommendations/merchants", async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const validatedData = getRecommendationsSchema.parse(req.body);

      // Calculate distance using Haversine formula in SQL
      const earthRadius = 6371; // Earth's radius in kilometers

      const merchants = await db
        .select({
          id: merchantProfiles.id,
          userId: merchantProfiles.userId,
          businessName: merchantProfiles.businessName,
          businessType: merchantProfiles.businessType,
          address: merchantProfiles.address,
          latitude: merchantProfiles.latitude,
          longitude: merchantProfiles.longitude,
          phone: merchantProfiles.phone,
          description: merchantProfiles.description,
          profilePicture: merchantProfiles.profilePicture,
          coverPhoto: merchantProfiles.coverPhoto,
          businessHours: merchantProfiles.businessHours,
          deliveryRadius: merchantProfiles.deliveryRadius,
          averageRating: merchantProfiles.averageRating,
          totalReviews: merchantProfiles.totalReviews,
          totalOrders: merchantProfiles.totalOrders,
          isVerified: merchantProfiles.isVerified,
          isActive: merchantProfiles.isActive,
          // Calculate distance using simpler formula
          distance: sql<number>`
            SQRT(
              POWER(${merchantProfiles.latitude} - ${validatedData.latitude}, 2) + 
              POWER(${merchantProfiles.longitude} - ${validatedData.longitude}, 2)
            ) * 111.0
          `.as('distance')
        })
        .from(merchantProfiles)
        .where(and(
          eq(merchantProfiles.isActive, true),
          validatedData.minRating 
            ? gt(merchantProfiles.averageRating, validatedData.minRating.toString())
            : sql`1=1`,
          validatedData.category 
            ? sql`${merchantProfiles.businessType} = ${validatedData.category}`
            : sql`1=1`,
          // Distance filter using bounding box for performance
          sql`abs(${merchantProfiles.latitude} - ${validatedData.latitude}) <= ${validatedData.radius / 111.0}`
        ))
        .having(lt(sql`distance`, validatedData.radius))
        .orderBy(
          validatedData.sortBy === 'distance' ? sql`distance` :
          validatedData.sortBy === 'rating' ? desc(merchantProfiles.averageRating) :
          validatedData.sortBy === 'popularity' ? desc(merchantProfiles.totalOrders) :
          desc(merchantProfiles.updatedAt)
        )
        .limit(validatedData.limit);

      // Calculate relevance score for each merchant
      const enhancedMerchants = await Promise.all(
        merchants.map(async (merchant) => {
          // Get user's interaction history with this merchant
          const interactions = await db
            .select()
            .from(locationRecommendations)
            .where(and(
              eq(locationRecommendations.userId, userId),
              eq(locationRecommendations.merchantId, merchant.userId)
            ))
            .limit(1);

          // Calculate relevance score based on multiple factors
          let relevanceScore = 0;

          // Distance factor (closer = higher score)
          const distanceFactor = Math.max(0, (validatedData.radius - (merchant.distance || 0)) / validatedData.radius);
          relevanceScore += distanceFactor * 30;

          // Rating factor
          const ratingFactor = parseFloat(merchant.averageRating || '0') / 5;
          relevanceScore += ratingFactor * 25;

          // Popularity factor
          const popularityFactor = Math.min(1, (merchant.totalOrders || 0) / 100);
          relevanceScore += popularityFactor * 20;

          // Verification bonus
          if (merchant.isVerified) {
            relevanceScore += 10;
          }

          // Previous interaction bonus
          const interaction = interactions[0];
          if (interaction) {
            relevanceScore += Math.min(5, (interaction.clickCount || 0) * 0.5);
            relevanceScore += Math.min(10, (interaction.conversionCount || 0) * 2);
          }

          // Business hours factor (open now = bonus)
          const now = new Date();
          const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          const currentHour = now.getHours();

          if (merchant.businessHours && typeof merchant.businessHours === 'object') {
            const todayHours = (merchant.businessHours as any)[currentDay];
            if (todayHours && todayHours.isOpen) {
              const openHour = parseInt(todayHours.open.split(':')[0]);
              const closeHour = parseInt(todayHours.close.split(':')[0]);
              if (currentHour >= openHour && currentHour < closeHour) {
                relevanceScore += 15; // Open now bonus
              }
            }
          }

          // Store/update recommendation data
          if (interaction) {
            await db
              .update(locationRecommendations)
              .set({
                distance: merchant.distance?.toString(),
                relevanceScore: relevanceScore.toString(),
                lastRecommended: new Date()
              })
              .where(eq(locationRecommendations.id, interaction.id));
          } else {
            await db
              .insert(locationRecommendations)
              .values({
                userId,
                merchantId: merchant.userId,
                latitude: validatedData.latitude.toString(),
                longitude: validatedData.longitude.toString(),
                distance: merchant.distance?.toString(),
                relevanceScore: relevanceScore.toString(),
              });
          }

          return {
            ...merchant,
            relevanceScore: Math.round(relevanceScore),
            isOpenNow: checkIfOpenNow(merchant.businessHours),
            estimatedDeliveryTime: calculateEstimatedDeliveryTime(merchant.distance || 0)
          };
        })
      );

      // Sort by relevance score if not sorting by distance
      if (validatedData.sortBy !== 'distance') {
        enhancedMerchants.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }

      // Real-time notification to admin about recommendation activity
      if ((global as any).io) {
        (global as any).io.to('admin_monitoring').emit('recommendation_activity', {
          type: 'MERCHANT_RECOMMENDATIONS_REQUESTED',
          userId,
          location: { latitude: validatedData.latitude, longitude: validatedData.longitude },
          totalRecommendations: enhancedMerchants.length,
          filters: {
            radius: validatedData.radius,
            category: validatedData.category,
            minRating: validatedData.minRating,
            sortBy: validatedData.sortBy
          },
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        merchants: enhancedMerchants,
        metadata: {
          userLocation: { latitude: validatedData.latitude, longitude: validatedData.longitude },
          searchRadius: validatedData.radius,
          totalFound: enhancedMerchants.length,
          sortBy: validatedData.sortBy,
          filters: {
            category: validatedData.category,
            minRating: validatedData.minRating
          }
        }
      });

    } catch (error: any) {
      console.error('Error getting merchant recommendations:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid request data', 
          details: error.errors 
        });
      }
      res.status(500).json({ success: false, error: 'Failed to get recommendations' });
    }
  });

  // Track user interaction with merchant recommendations
  app.post("/api/recommendations/track", async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const validatedData = trackInteractionSchema.parse(req.body);

      // Find existing recommendation record
      const [recommendation] = await db
        .select()
        .from(locationRecommendations)
        .where(and(
          eq(locationRecommendations.userId, userId),
          eq(locationRecommendations.merchantId, validatedData.merchantId)
        ))
        .limit(1);

      if (recommendation) {
        // Update interaction counts
        const updates: any = {};

        if (validatedData.interactionType === 'click') {
          updates.clickCount = (recommendation.clickCount || 0) + 1;
        } else if (validatedData.interactionType === 'order') {
          updates.conversionCount = (recommendation.conversionCount || 0) + 1;
        }

        updates.lastRecommended = new Date();

        await db
          .update(locationRecommendations)
          .set(updates)
          .where(eq(locationRecommendations.id, recommendation.id));
      }

      // Real-time analytics update
      if ((global as any).io) {
        (global as any).io.to('admin_monitoring').emit('recommendation_interaction', {
          type: 'RECOMMENDATION_INTERACTION',
          userId,
          merchantId: validatedData.merchantId,
          interactionType: validatedData.interactionType,
          location: { latitude: validatedData.latitude, longitude: validatedData.longitude },
          timestamp: Date.now()
        });
      }

      res.json({ success: true, message: 'Interaction tracked successfully' });
    } catch (error: any) {
      console.error('Error tracking interaction:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid request data', 
          details: error.errors 
        });
      }
      res.status(500).json({ success: false, error: 'Failed to track interaction' });
    }
  });

  // Get recommendation analytics
  app.get("/api/recommendations/analytics", async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      // Get user's recommendation history
      const recommendationHistory = await db
        .select({
          merchantId: locationRecommendations.merchantId,
          businessName: merchantProfiles.businessName,
          businessType: merchantProfiles.businessType,
          clickCount: locationRecommendations.clickCount,
          conversionCount: locationRecommendations.conversionCount,
          lastRecommended: locationRecommendations.lastRecommended,
          averageRating: merchantProfiles.averageRating
        })
        .from(locationRecommendations)
        .leftJoin(merchantProfiles, eq(locationRecommendations.merchantId, merchantProfiles.userId))
        .where(eq(locationRecommendations.userId, userId))
        .orderBy(desc(locationRecommendations.lastRecommended))
        .limit(50);

      // Calculate analytics
      const analytics = {
        totalRecommendations: recommendationHistory.length,
        totalClicks: recommendationHistory.reduce((sum, item) => sum + (item.clickCount || 0), 0),
        totalConversions: recommendationHistory.reduce((sum, item) => sum + (item.conversionCount || 0), 0),
        averageRatingOfInteracted: recommendationHistory
          .filter(item => (item.clickCount || 0) > 0)
          .reduce((sum, item) => sum + parseFloat(item.averageRating || '0'), 0) / 
          recommendationHistory.filter(item => (item.clickCount || 0) > 0).length || 0,
        mostInteractedCategories: getTopCategories(recommendationHistory),
        recentRecommendations: recommendationHistory.slice(0, 10)
      };

      res.json({ success: true, analytics });
    } catch (error) {
      console.error('Error fetching recommendation analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
  });
}

// Helper functions
function checkIfOpenNow(businessHours: any): boolean {
  if (!businessHours || typeof businessHours !== 'object') return false;

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 100 + now.getMinutes();

  const todayHours = businessHours[currentDay];
  if (!todayHours || !todayHours.isOpen) return false;

  const openTime = parseInt(todayHours.open.replace(':', ''));
  const closeTime = parseInt(todayHours.close.replace(':', ''));

  return currentTime >= openTime && currentTime < closeTime;
}

function calculateEstimatedDeliveryTime(distance: number): string {
  // Assume average speed of 25 km/h for delivery
  const timeInHours = distance / 25;
  const timeInMinutes = Math.round(timeInHours * 60);

  if (timeInMinutes < 60) {
    return `${timeInMinutes} min`;
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
}

function getTopCategories(history: any[]): Array<{category: string, count: number}> {
  const categoryCounts: Record<string, number> = {};

  history.forEach(item => {
    if ((item.clickCount || 0) > 0 && item.businessType) {
      categoryCounts[item.businessType] = (categoryCounts[item.businessType] || 0) + (item.clickCount || 0);
    }
  });

  return Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}