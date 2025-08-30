
import { db } from '../db';
import { orders, driverProfiles, users, transactions, userLocations } from '../../shared/schema';
import { eq, and, isNull, sql, desc, gte } from 'drizzle-orm';

interface DriverScore {
  driverId: number;
  score: number;
  distance: number;
  rating: number;
  totalDeliveries: number;
}

export class AutoAssignmentService {
  /**
   * Auto-assign the best available driver to an order
   */
  static async assignBestDriver(orderId: number, orderLocation: { latitude: number, longitude: number }) {
    try {
      // Get available drivers within reasonable distance
      const availableDrivers = await db
        .select({
          driverId: driverProfiles.userId,
          currentLocation: driverProfiles.currentLocation,
          rating: driverProfiles.rating,
          totalDeliveries: driverProfiles.totalDeliveries,
          averageDeliveryTime: driverProfiles.averageDeliveryTime,
          isOnline: driverProfiles.isOnline,
          isAvailable: driverProfiles.isAvailable
        })
        .from(driverProfiles)
        .where(and(
          eq(driverProfiles.isOnline, true),
          eq(driverProfiles.isAvailable, true),
          eq(driverProfiles.verificationStatus, 'VERIFIED')
        ));

      if (availableDrivers.length === 0) {
        return null;
      }

      // Score each driver based on distance, rating, and performance
      const scoredDrivers: DriverScore[] = [];

      for (const driver of availableDrivers) {
        if (!driver.currentLocation) continue;

        const driverLocation = JSON.parse(driver.currentLocation);
        const distance = this.calculateDistance(
          orderLocation.latitude,
          orderLocation.longitude,
          driverLocation.latitude,
          driverLocation.longitude
        );

        // Skip drivers too far away (> 10km)
        if (distance > 10) continue;

        const score = this.calculateDriverScore(driver, distance);
        
        scoredDrivers.push({
          driverId: driver.driverId,
          score,
          distance,
          rating: driver.rating || 0,
          totalDeliveries: driver.totalDeliveries || 0
        });
      }

      if (scoredDrivers.length === 0) {
        return null;
      }

      // Sort by score (highest first)
      scoredDrivers.sort((a, b) => b.score - a.score);
      const bestDriver = scoredDrivers[0];

      // Assign the order to the best driver
      const [assignedOrder] = await db
        .update(orders)
        .set({
          driverId: bestDriver.driverId,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(orders.id, orderId),
          isNull(orders.driverId)
        ))
        .returning();

      if (assignedOrder) {
        // Update driver availability
        await db
          .update(driverProfiles)
          .set({
            isAvailable: false,
            updatedAt: new Date()
          })
          .where(eq(driverProfiles.userId, bestDriver.driverId));

        // Get driver and customer details for notifications
        const [driverDetails] = await db.select({
          name: users.fullName,
          phone: users.phone
        })
        .from(users)
        .where(eq(users.id, bestDriver.driverId))
        .limit(1);

        const [customerDetails] = await db.select({
          name: users.fullName,
          phone: users.phone
        })
        .from(users)
        .where(eq(users.id, assignedOrder.customerId))
        .limit(1);

        // Send real-time notifications
        if (global.io) {
          global.io.to(`user_${bestDriver.driverId}`).emit('order_assigned', {
            orderId: assignedOrder.id,
            orderNumber: assignedOrder.orderNumber,
            customerName: customerDetails?.name || 'Customer',
            customerPhone: customerDetails?.phone,
            deliveryLocation: orderLocation,
            estimatedDistance: bestDriver.distance,
            estimatedEarnings: assignedOrder.driverEarnings || 0,
            timestamp: Date.now()
          });

          global.io.to(`user_${assignedOrder.customerId}`).emit('driver_assigned', {
            orderId: assignedOrder.id,
            driverId: bestDriver.driverId,
            driverName: driverDetails?.name || 'Driver',
            driverPhone: driverDetails?.phone,
            estimatedArrival: this.calculateETA(bestDriver.distance),
            timestamp: Date.now()
          });

          // Notify admin dashboard
          global.io.to('admin_orders').emit('order_auto_assigned', {
            orderId: assignedOrder.id,
            driverId: bestDriver.driverId,
            distance: bestDriver.distance,
            score: bestDriver.score,
            timestamp: Date.now()
          });
        }

        return {
          success: true,
          assignedOrder,
          driverId: bestDriver.driverId,
          driverScore: bestDriver.score,
          distance: bestDriver.distance
        };
      }

      return null;
    } catch (error) {
      console.error('Auto-assignment error:', error);
      return null;
    }
  }

  /**
   * Calculate driver score based on multiple factors
   */
  private static calculateDriverScore(driver: any, distance: number): number {
    let score = 100;

    // Distance factor (closer is better)
    const distanceScore = Math.max(0, 100 - (distance * 10));
    score = score * 0.4 + distanceScore * 0.6;

    // Rating factor
    const rating = driver.rating || 3.0;
    const ratingScore = (rating / 5.0) * 100;
    score = score * 0.7 + ratingScore * 0.3;

    // Experience factor
    const experience = Math.min(driver.totalDeliveries || 0, 100);
    const experienceScore = experience;
    score = score * 0.9 + experienceScore * 0.1;

    // Speed factor (faster average delivery time is better)
    if (driver.averageDeliveryTime && driver.averageDeliveryTime > 0) {
      const speedScore = Math.max(0, 100 - (driver.averageDeliveryTime - 20) * 2);
      score = score * 0.95 + speedScore * 0.05;
    }

    return Math.round(score);
  }

  /**
   * Calculate distance between two points
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate estimated time of arrival
   */
  private static calculateETA(distance: number): string {
    const averageSpeed = 25; // km/h in urban areas
    const timeHours = distance / averageSpeed;
    const timeMinutes = timeHours * 60;
    const bufferMinutes = Math.min(distance * 2, 15); // Add buffer time
    
    const totalMinutes = timeMinutes + bufferMinutes;
    const eta = new Date(Date.now() + totalMinutes * 60 * 1000);
    
    return eta.toISOString();
  }

  /**
   * Auto-assign next available order to a driver who just completed delivery
   */
  static async assignNextOrder(driverId: number) {
    try {
      // Get driver's current location
      const [driver] = await db
        .select({
          currentLocation: driverProfiles.currentLocation,
          isOnline: driverProfiles.isOnline
        })
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, driverId))
        .limit(1);

      if (!driver || !driver.isOnline || !driver.currentLocation) {
        return null;
      }

      const driverLocation = JSON.parse(driver.currentLocation);

      // Find the nearest pending order
      const pendingOrders = await db
        .select({
          id: orders.id,
          deliveryAddress: orders.deliveryAddress,
          createdAt: orders.createdAt,
          totalAmount: orders.totalAmount
        })
        .from(orders)
        .where(and(
          isNull(orders.driverId),
          sql`${orders.status} IN ('PENDING', 'CONFIRMED')`
        ))
        .orderBy(desc(orders.createdAt))
        .limit(10);

      if (pendingOrders.length === 0) {
        return null;
      }

      // Find the closest order
      let closestOrder = null;
      let shortestDistance = Infinity;

      for (const order of pendingOrders) {
        try {
          const deliveryLocation = JSON.parse(order.deliveryAddress);
          if (deliveryLocation.latitude && deliveryLocation.longitude) {
            const distance = this.calculateDistance(
              driverLocation.latitude,
              driverLocation.longitude,
              deliveryLocation.latitude,
              deliveryLocation.longitude
            );

            if (distance < shortestDistance && distance <= 8) { // Within 8km
              shortestDistance = distance;
              closestOrder = order;
            }
          }
        } catch (error) {
          console.warn('Invalid delivery address format:', order.deliveryAddress);
        }
      }

      if (closestOrder) {
        const deliveryLocation = JSON.parse(closestOrder.deliveryAddress);
        return await this.assignBestDriver(closestOrder.id, deliveryLocation);
      }

      return null;
    } catch (error) {
      console.error('Auto-assign next order error:', error);
      return null;
    }
  }
}
