
import { Router } from 'express';
import { db } from '../db';
import { orders, driverProfiles, userLocations, orderTracking, users } from '../../shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Validation schemas
const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  accuracy: z.number().positive().optional(),
  timestamp: z.string().datetime().optional()
});

const trackingUpdateSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional(),
  estimatedArrival: z.string().datetime().optional(),
  notes: z.string().optional()
});

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

// Real-time location update for drivers
router.post('/location/update', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const data = locationUpdateSchema.parse(req.body);

    // Verify user is a driver
    const [driver] = await db.select()
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, userId))
      .limit(1);

    if (!driver) {
      return res.status(403).json({
        success: false,
        message: 'Driver profile required'
      });
    }

    // Update driver location
    const [locationUpdate] = await db.insert(userLocations).values({
      userId,
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading,
      speed: data.speed,
      accuracy: data.accuracy,
      timestamp: new Date(data.timestamp || Date.now()),
      locationType: 'DRIVER_LIVE'
    }).returning();

    // Get active orders for this driver
    const activeOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.driverId, userId),
        eq(orders.status, 'IN_TRANSIT')
      ));

    // Broadcast location updates to relevant parties
    if (global.io && activeOrders.length > 0) {
      for (const order of activeOrders) {
        // Update consumers tracking this order
        global.io.to(`order_${order.id}`).emit('driver_location_update', {
          orderId: order.id,
          driverId: userId,
          location: {
            latitude: data.latitude,
            longitude: data.longitude,
            heading: data.heading,
            speed: data.speed,
            accuracy: data.accuracy
          },
          timestamp: locationUpdate.timestamp,
          estimatedArrival: calculateETA(order, data)
        });

        // Update order tracking record
        await db.insert(orderTracking).values({
          orderId: order.id,
          status: 'LOCATION_UPDATE',
          location: JSON.stringify({
            latitude: data.latitude,
            longitude: data.longitude,
            heading: data.heading,
            speed: data.speed
          }),
          timestamp: new Date(),
          driverId: userId
        });
      }

      // Broadcast to admin dashboard
      global.io.to('admin_tracking').emit('driver_location_update', {
        driverId: userId,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed
        },
        activeOrders: activeOrders.length,
        timestamp: locationUpdate.timestamp
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: locationUpdate,
      activeOrders: activeOrders.length
    });

  } catch (error: any) {
    console.error('Location update error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update location'
    });
  }
});

// Get real-time tracking for an order
router.get('/order/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session!.userId!;

    // Get order and verify access
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

    // Verify user has access to this order
    if (order.userId !== userId && order.driverId !== userId) {
      // Check if user is admin or merchant
      const [user] = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user || !['ADMIN', 'MERCHANT'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Get tracking history
    const trackingHistory = await db.select()
      .from(orderTracking)
      .where(eq(orderTracking.orderId, order.id))
      .orderBy(desc(orderTracking.timestamp));

    // Get current driver location if driver is assigned
    let currentLocation = null;
    if (order.driverId) {
      const [driverLocation] = await db.select()
        .from(userLocations)
        .where(and(
          eq(userLocations.userId, order.driverId),
          eq(userLocations.locationType, 'DRIVER_LIVE')
        ))
        .orderBy(desc(userLocations.timestamp))
        .limit(1);

      if (driverLocation) {
        currentLocation = {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          heading: driverLocation.heading,
          speed: driverLocation.speed,
          accuracy: driverLocation.accuracy,
          timestamp: driverLocation.timestamp
        };
      }
    }

    // Calculate estimated arrival time
    const estimatedArrival = order.driverId && currentLocation ? 
      calculateETA(order, currentLocation) : null;

    res.json({
      success: true,
      tracking: {
        orderId: order.id,
        status: order.status,
        currentLocation,
        estimatedArrival,
        trackingHistory: trackingHistory.map(track => ({
          status: track.status,
          location: track.location ? JSON.parse(track.location) : null,
          timestamp: track.timestamp,
          notes: track.notes
        })),
        deliveryAddress: order.deliveryAddress,
        pickupAddress: order.pickupAddress
      }
    });

  } catch (error: any) {
    console.error('Get tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tracking information'
    });
  }
});

// Update order tracking status
router.post('/order/:orderId/status', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session!.userId!;
    const data = trackingUpdateSchema.parse({
      ...req.body,
      orderId
    });

    // Get order and verify access
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

    // Verify user can update this order
    if (order.driverId !== userId) {
      const [user] = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user || !['ADMIN', 'MERCHANT'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only assigned driver or admin can update order status'
        });
      }
    }

    // Create tracking record
    const [trackingRecord] = await db.insert(orderTracking).values({
      orderId: order.id,
      status: data.status,
      location: data.location ? JSON.stringify(data.location) : null,
      timestamp: new Date(),
      driverId: userId,
      notes: data.notes
    }).returning();

    // Update order status if necessary
    const statusUpdateMap: Record<string, string> = {
      'PICKED_UP': 'IN_TRANSIT',
      'DELIVERED': 'DELIVERED',
      'FAILED_DELIVERY': 'FAILED'
    };

    if (statusUpdateMap[data.status]) {
      await db.update(orders).set({
        status: statusUpdateMap[data.status],
        updatedAt: new Date()
      }).where(eq(orders.id, order.id));
    }

    // Real-time notifications
    if (global.io) {
      // Notify customer
      global.io.to(`user_${order.userId}`).emit('order_update', {
        orderId: order.id,
        status: data.status,
        location: data.location,
        estimatedArrival: data.estimatedArrival,
        notes: data.notes,
        timestamp: trackingRecord.timestamp
      });

      // Notify order room
      global.io.to(`order_${order.id}`).emit('tracking_update', {
        orderId: order.id,
        status: data.status,
        location: data.location,
        estimatedArrival: data.estimatedArrival,
        timestamp: trackingRecord.timestamp
      });

      // Notify admin dashboard
      global.io.to('admin_orders').emit('order_status_change', {
        orderId: order.id,
        oldStatus: order.status,
        newStatus: data.status,
        driverId: userId,
        timestamp: trackingRecord.timestamp
      });
    }

    res.json({
      success: true,
      message: 'Tracking updated successfully',
      tracking: trackingRecord
    });

  } catch (error: any) {
    console.error('Update tracking error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update tracking'
    });
  }
});

// Get driver's current location
router.get('/driver/:driverId/location', requireAuth, async (req, res) => {
  try {
    const { driverId } = req.params;
    const userId = req.session!.userId!;

    // Get latest driver location
    const [location] = await db.select()
      .from(userLocations)
      .where(and(
        eq(userLocations.userId, parseInt(driverId)),
        eq(userLocations.locationType, 'DRIVER_LIVE'),
        gte(userLocations.timestamp, new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
      ))
      .orderBy(desc(userLocations.timestamp))
      .limit(1);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Driver location not available'
      });
    }

    res.json({
      success: true,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed: location.speed,
        accuracy: location.accuracy,
        timestamp: location.timestamp
      }
    });

  } catch (error: any) {
    console.error('Get driver location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver location'
    });
  }
});

// Get multiple order tracking (for dashboard)
router.post('/orders/batch', requireAuth, async (req, res) => {
  try {
    const { orderIds } = req.body;
    const userId = req.session!.userId!;

    if (!Array.isArray(orderIds)) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs must be an array'
      });
    }

    // Get orders with tracking information
    const ordersWithTracking = await Promise.all(
      orderIds.map(async (orderId: string) => {
        const [order] = await db.select()
          .from(orders)
          .where(eq(orders.id, parseInt(orderId)))
          .limit(1);

        if (!order) return null;

        // Verify access
        if (order.userId !== userId && order.driverId !== userId) {
          const [user] = await db.select().from(users)
            .where(eq(users.id, userId))
            .limit(1);
          
          if (!user || !['ADMIN', 'MERCHANT'].includes(user.role)) {
            return null;
          }
        }

        // Get latest tracking
        const [latestTracking] = await db.select()
          .from(orderTracking)
          .where(eq(orderTracking.orderId, order.id))
          .orderBy(desc(orderTracking.timestamp))
          .limit(1);

        return {
          orderId: order.id,
          status: order.status,
          latestTracking: latestTracking ? {
            status: latestTracking.status,
            location: latestTracking.location ? JSON.parse(latestTracking.location) : null,
            timestamp: latestTracking.timestamp
          } : null
        };
      })
    );

    const validOrders = ordersWithTracking.filter(order => order !== null);

    res.json({
      success: true,
      orders: validOrders
    });

  } catch (error: any) {
    console.error('Batch tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get batch tracking'
    });
  }
});

// Join order tracking room (WebSocket)
router.post('/order/:orderId/join', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session!.userId!;

    // Verify order access
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

    if (order.userId !== userId && order.driverId !== userId) {
      const [user] = await db.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user || !['ADMIN', 'MERCHANT'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      message: `Joined tracking for order ${orderId}`,
      room: `order_${orderId}`
    });

  } catch (error: any) {
    console.error('Join tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join tracking'
    });
  }
});

// Helper function to calculate ETA
function calculateETA(order: any, currentLocation: any): string | null {
  try {
    // This is a simplified ETA calculation
    // In production, integrate with mapping services like Google Maps or Mapbox
    
    const deliveryLocation = JSON.parse(order.deliveryAddress);
    if (!deliveryLocation.latitude || !deliveryLocation.longitude) {
      return null;
    }

    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      deliveryLocation.latitude,
      deliveryLocation.longitude
    );

    // Estimate time based on average speed (assuming 30 km/h in city)
    const averageSpeed = currentLocation.speed || 30; // km/h
    const estimatedTimeHours = distance / averageSpeed;
    const estimatedTimeMs = estimatedTimeHours * 60 * 60 * 1000;

    return new Date(Date.now() + estimatedTimeMs).toISOString();
  } catch (error) {
    console.error('ETA calculation error:', error);
    return null;
  }
}

// Helper function to calculate distance between two points
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
