import { db } from "../db";
import { 
  userBehaviorTracking, 
  personalizationProfiles, 
  systemMetrics, 
  crossRoleInteractions,
  users,
  orders,
  products
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, count, avg, sum } from "drizzle-orm";
import type { 
  InsertUserBehaviorTracking, 
  InsertPersonalizationProfile, 
  InsertSystemMetric,
  InsertCrossRoleInteraction 
} from "@shared/schema";

export class AnalyticsService {
  // User Behavior Tracking
  static async trackUserBehavior(behaviorData: Omit<InsertUserBehaviorTracking, 'id' | 'createdAt'>) {
    try {
      const [tracking] = await db.insert(userBehaviorTracking).values({
        ...behaviorData,
      }).returning();

      // Update personalization profile asynchronously
      this.updatePersonalizationProfile(behaviorData.userId, behaviorData);

      return { success: true, tracking };
    } catch (error) {
      console.error('Error tracking user behavior:', error);
      return { success: false, error: 'Failed to track behavior' };
    }
  }

  // Personalization Profile Management
  static async updatePersonalizationProfile(userId: number, behaviorData: any) {
    try {
      // Get existing profile or create new one
      let profile = await db
        .select()
        .from(personalizationProfiles)
        .where(eq(personalizationProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        // Create new profile
        await db.insert(personalizationProfiles).values({
          userId,
          lastUpdated: new Date(),
        });
        
        profile = await db
          .select()
          .from(personalizationProfiles)
          .where(eq(personalizationProfiles.userId, userId))
          .limit(1);
      }

      const existingProfile = profile[0];

      // Update profile based on behavior data
      const updates: any = {
        lastUpdated: new Date(),
      };

      // Update preferred categories based on interactions
      if (behaviorData.eventCategory) {
        const preferredCategories = existingProfile.preferredCategories || [];
        if (!preferredCategories.includes(behaviorData.eventCategory)) {
          preferredCategories.push(behaviorData.eventCategory);
          updates.preferredCategories = preferredCategories.slice(-10); // Keep last 10
        }
      }

      // Update peak activity hours
      const currentHour = new Date().getHours();
      const peakHours = existingProfile.peakActivityHours || [];
      if (!peakHours.includes(currentHour)) {
        peakHours.push(currentHour);
        updates.peakActivityHours = peakHours.slice(-12); // Keep last 12 hours
      }

      // Update average order value if it's a purchase event
      if (behaviorData.eventType === 'PURCHASE' && behaviorData.eventValue) {
        const currentAOV = parseFloat(existingProfile.averageOrderValue || '0');
        const newAOV = currentAOV === 0 ? behaviorData.eventValue : (currentAOV + behaviorData.eventValue) / 2;
        updates.averageOrderValue = newAOV.toString();
      }

      await db
        .update(personalizationProfiles)
        .set(updates)
        .where(eq(personalizationProfiles.userId, userId));

      return { success: true };
    } catch (error) {
      console.error('Error updating personalization profile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  static async getPersonalizationProfile(userId: number) {
    try {
      const profile = await db
        .select()
        .from(personalizationProfiles)
        .where(eq(personalizationProfiles.userId, userId))
        .limit(1);

      return { success: true, profile: profile[0] || null };
    } catch (error) {
      console.error('Error fetching personalization profile:', error);
      return { success: false, error: 'Failed to fetch profile' };
    }
  }

  // Cross-Role Interaction Tracking
  static async trackCrossRoleInteraction(interactionData: Omit<InsertCrossRoleInteraction, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const [interaction] = await db.insert(crossRoleInteractions).values({
        ...interactionData,
      }).returning();

      return { success: true, interaction };
    } catch (error) {
      console.error('Error tracking cross-role interaction:', error);
      return { success: false, error: 'Failed to track interaction' };
    }
  }

  static async updateInteractionStatus(
    interactionId: string, 
    status: string, 
    outcome?: string,
    satisfactionRating?: number
  ) {
    try {
      const updates: any = {
        interactionStatus: status,
        updatedAt: new Date(),
      };

      if (status === 'COMPLETED') {
        updates.completedAt = new Date();
        if (outcome) updates.outcome = outcome;
        if (satisfactionRating) updates.satisfactionRating = satisfactionRating;
      }

      await db
        .update(crossRoleInteractions)
        .set(updates)
        .where(eq(crossRoleInteractions.id, interactionId));

      return { success: true };
    } catch (error) {
      console.error('Error updating interaction status:', error);
      return { success: false, error: 'Failed to update interaction' };
    }
  }

  // System Metrics
  static async recordSystemMetric(metricData: Omit<InsertSystemMetric, 'id' | 'createdAt'>) {
    try {
      const [metric] = await db.insert(systemMetrics).values({
        ...metricData,
      }).returning();

      return { success: true, metric };
    } catch (error) {
      console.error('Error recording system metric:', error);
      return { success: false, error: 'Failed to record metric' };
    }
  }

  // Analytics Queries
  static async getUserEngagementMetrics(userId: number, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const metrics = await db
        .select({
          eventType: userBehaviorTracking.eventType,
          eventCount: count(userBehaviorTracking.id),
          avgDuration: avg(userBehaviorTracking.duration),
          totalValue: sum(userBehaviorTracking.eventValue),
        })
        .from(userBehaviorTracking)
        .where(and(
          eq(userBehaviorTracking.userId, userId),
          gte(userBehaviorTracking.timestamp, startDate)
        ))
        .groupBy(userBehaviorTracking.eventType);

      return { success: true, metrics };
    } catch (error) {
      console.error('Error fetching user engagement metrics:', error);
      return { success: false, error: 'Failed to fetch metrics' };
    }
  }

  static async getPlatformUsageMetrics(days: number = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const usage = await db
        .select({
          date: sql`DATE(${userBehaviorTracking.timestamp})`,
          userRole: userBehaviorTracking.userRole,
          eventType: userBehaviorTracking.eventType,
          count: count(userBehaviorTracking.id),
          uniqueUsers: sql`COUNT(DISTINCT ${userBehaviorTracking.userId})`,
        })
        .from(userBehaviorTracking)
        .where(gte(userBehaviorTracking.timestamp, startDate))
        .groupBy(
          sql`DATE(${userBehaviorTracking.timestamp})`,
          userBehaviorTracking.userRole,
          userBehaviorTracking.eventType
        )
        .orderBy(sql`DATE(${userBehaviorTracking.timestamp}) DESC`);

      return { success: true, usage };
    } catch (error) {
      console.error('Error fetching platform usage metrics:', error);
      return { success: false, error: 'Failed to fetch usage metrics' };
    }
  }

  static async getInteractionFlowMetrics(days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const flows = await db
        .select({
          initiatorRole: crossRoleInteractions.initiatorRole,
          targetRole: crossRoleInteractions.targetRole,
          interactionType: crossRoleInteractions.interactionType,
          status: crossRoleInteractions.interactionStatus,
          count: count(crossRoleInteractions.id),
          avgDuration: avg(crossRoleInteractions.duration),
          avgSatisfaction: avg(crossRoleInteractions.satisfactionRating),
        })
        .from(crossRoleInteractions)
        .where(gte(crossRoleInteractions.startedAt, startDate))
        .groupBy(
          crossRoleInteractions.initiatorRole,
          crossRoleInteractions.targetRole,
          crossRoleInteractions.interactionType,
          crossRoleInteractions.interactionStatus
        );

      return { success: true, flows };
    } catch (error) {
      console.error('Error fetching interaction flow metrics:', error);
      return { success: false, error: 'Failed to fetch flow metrics' };
    }
  }

  // Recommendation Engine
  static async generateRecommendations(userId: number) {
    try {
      const profile = await this.getPersonalizationProfile(userId);
      if (!profile.success || !profile.profile) {
        return { success: false, error: 'Profile not found' };
      }

      const userProfile = profile.profile;
      
      // Get user behavior patterns
      const recentBehavior = await db
        .select()
        .from(userBehaviorTracking)
        .where(and(
          eq(userBehaviorTracking.userId, userId),
          gte(userBehaviorTracking.timestamp, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        ))
        .orderBy(desc(userBehaviorTracking.timestamp))
        .limit(100);

      // Generate recommendations based on:
      // 1. Preferred categories
      // 2. Interaction patterns
      // 3. Similar user behaviors
      // 4. Trending items

      const recommendations = {
        merchants: [], // TODO: Implement merchant recommendations
        products: [], // TODO: Implement product recommendations
        services: [], // TODO: Implement service recommendations
        promotions: [], // TODO: Implement promotion recommendations
      };

      return { success: true, recommendations };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return { success: false, error: 'Failed to generate recommendations' };
    }
  }

  // Churn Risk Analysis
  static async calculateChurnRisk(userId: number) {
    try {
      const profile = await this.getPersonalizationProfile(userId);
      if (!profile.success || !profile.profile) {
        return { success: false, error: 'Profile not found' };
      }

      // Analyze recent activity patterns
      const recentActivity = await db
        .select()
        .from(userBehaviorTracking)
        .where(and(
          eq(userBehaviorTracking.userId, userId),
          gte(userBehaviorTracking.timestamp, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        ))
        .orderBy(desc(userBehaviorTracking.timestamp));

      // Calculate churn risk based on:
      // 1. Days since last activity
      // 2. Decrease in engagement
      // 3. Frequency of complaints
      // 4. Completion rate of interactions

      let riskScore = 0.0;

      // Days since last activity
      if (recentActivity.length === 0) {
        riskScore += 0.4;
      } else {
        const daysSinceLastActivity = Math.floor(
          (Date.now() - new Date(recentActivity[0].timestamp).getTime()) / (24 * 60 * 60 * 1000)
        );
        if (daysSinceLastActivity > 7) riskScore += 0.3;
        else if (daysSinceLastActivity > 3) riskScore += 0.15;
      }

      // Engagement decrease
      const engagementTrend = this.calculateEngagementTrend(recentActivity);
      if (engagementTrend < -0.5) riskScore += 0.3;
      else if (engagementTrend < -0.2) riskScore += 0.15;

      // Update profile with calculated risk
      await db
        .update(personalizationProfiles)
        .set({ 
          churnRisk: Math.min(riskScore, 1.0).toString(),
          lastUpdated: new Date()
        })
        .where(eq(personalizationProfiles.userId, userId));

      return { success: true, churnRisk: Math.min(riskScore, 1.0) };
    } catch (error) {
      console.error('Error calculating churn risk:', error);
      return { success: false, error: 'Failed to calculate churn risk' };
    }
  }

  private static calculateEngagementTrend(activities: any[]): number {
    if (activities.length < 2) return 0;

    const midpoint = Math.floor(activities.length / 2);
    const recentHalf = activities.slice(0, midpoint);
    const olderHalf = activities.slice(midpoint);

    const recentEngagement = recentHalf.reduce((sum, activity) => 
      sum + (activity.duration || 0), 0) / recentHalf.length;
    const olderEngagement = olderHalf.reduce((sum, activity) => 
      sum + (activity.duration || 0), 0) / olderHalf.length;

    return olderEngagement === 0 ? 0 : (recentEngagement - olderEngagement) / olderEngagement;
  }

  // Real-time Dashboard Data
  static async getDashboardMetrics() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Today's metrics
      const todayMetrics = await db
        .select({
          eventType: userBehaviorTracking.eventType,
          count: count(userBehaviorTracking.id),
          uniqueUsers: sql`COUNT(DISTINCT ${userBehaviorTracking.userId})`,
        })
        .from(userBehaviorTracking)
        .where(gte(userBehaviorTracking.timestamp, today))
        .groupBy(userBehaviorTracking.eventType);

      // Active interactions
      const activeInteractions = await db
        .select({
          status: crossRoleInteractions.interactionStatus,
          count: count(crossRoleInteractions.id),
        })
        .from(crossRoleInteractions)
        .where(eq(crossRoleInteractions.interactionStatus, 'IN_PROGRESS'))
        .groupBy(crossRoleInteractions.interactionStatus);

      return { 
        success: true, 
        dashboard: {
          todayMetrics,
          activeInteractions,
          timestamp: now,
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return { success: false, error: 'Failed to fetch dashboard metrics' };
    }
  }
}