
import { Router } from 'express';
import { db } from '../db';
import { orders, driverProfiles } from '../../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { AutoAssignmentService } from '../services/auto-assignment';

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

// Request driver assignment for an order
router.post('/:orderId/request-assignment', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session!.userId!;

    // Get order details
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, parseInt(orderId)))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify user owns the order
    if (order.customerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order already has a driver
    if (order.driverId) {
      return res.status(400).json({
        success: false,
        message: 'Order already has an assigned driver'
      });
    }

    // Parse delivery location
    let deliveryLocation;
    try {
      deliveryLocation = JSON.parse(order.deliveryAddress);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery address format'
      });
    }

    if (!deliveryLocation.latitude || !deliveryLocation.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Delivery coordinates are required for auto-assignment'
      });
    }

    // Attempt auto-assignment
    const result = await AutoAssignmentService.assignBestDriver(
      order.id,
      {
        latitude: deliveryLocation.latitude,
        longitude: deliveryLocation.longitude
      }
    );

    if (result) {
      res.json({
        success: true,
        message: 'Driver assigned successfully',
        assignment: {
          orderId: result.assignedOrder.id,
          driverId: result.driverId,
          distance: result.distance,
          score: result.driverScore
        }
      });
    } else {
      res.json({
        success: false,
        message: 'No available drivers found in your area. We will notify you when a driver becomes available.'
      });
    }

  } catch (error: any) {
    console.error('Request assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request driver assignment'
    });
  }
});

// Get assignment status for an order
router.get('/:orderId/assignment-status', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session!.userId!;

    // Get order with driver details
    const [order] = await db.select()
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

    let assignmentStatus = {
      hasDriver: !!order.driverId,
      status: order.status,
      driverId: order.driverId,
      assignedAt: order.acceptedAt
    };

    // Get driver details if assigned
    if (order.driverId) {
      const [driverProfile] = await db.select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, order.driverId))
        .limit(1);

      if (driverProfile) {
        assignmentStatus = {
          ...assignmentStatus,
          driverDetails: {
            rating: driverProfile.rating,
            totalDeliveries: driverProfile.totalDeliveries,
            isOnline: driverProfile.isOnline,
            currentLocation: driverProfile.currentLocation ? JSON.parse(driverProfile.currentLocation) : null
          }
        } as any;
      }
    }

    res.json({
      success: true,
      assignment: assignmentStatus
    });

  } catch (error: any) {
    console.error('Get assignment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assignment status'
    });
  }
});

// Get available drivers in area (for admin/debugging)
router.post('/available-drivers', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required'
      });
    }

    // Get available drivers
    const availableDrivers = await db
      .select({
        userId: driverProfiles.userId,
        rating: driverProfiles.rating,
        totalDeliveries: driverProfiles.totalDeliveries,
        currentLocation: driverProfiles.currentLocation,
        isOnline: driverProfiles.isOnline,
        isAvailable: driverProfiles.isAvailable
      })
      .from(driverProfiles)
      .where(and(
        eq(driverProfiles.isOnline, true),
        eq(driverProfiles.isAvailable, true),
        eq(driverProfiles.verificationStatus, 'VERIFIED')
      ));

    // Filter by distance and calculate scores
    const driversInRange = availableDrivers
      .filter(driver => {
        if (!driver.currentLocation) return false;
        
        try {
          const driverLocation = JSON.parse(driver.currentLocation);
          const distance = calculateDistance(
            latitude,
            longitude,
            driverLocation.latitude,
            driverLocation.longitude
          );
          return distance <= radius;
        } catch {
          return false;
        }
      })
      .map(driver => {
        const driverLocation = JSON.parse(driver.currentLocation!);
        const distance = calculateDistance(
          latitude,
          longitude,
          driverLocation.latitude,
          driverLocation.longitude
        );

        return {
          driverId: driver.userId,
          rating: driver.rating,
          totalDeliveries: driver.totalDeliveries,
          distance: Math.round(distance * 100) / 100,
          isOnline: driver.isOnline,
          isAvailable: driver.isAvailable
        };
      })
      .sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      drivers: driversInRange,
      total: driversInRange.length
    });

  } catch (error: any) {
    console.error('Get available drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available drivers'
    });
  }
});

// Helper function to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export default router;
