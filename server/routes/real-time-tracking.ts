
import { Router } from 'express';
import { db } from '../db';
import { driverProfiles, orders, users, userLocations } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Validation schemas
const updateDriverLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  orderId: z.string().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional()
});

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

// Real-time driver location update
router.put('/driver-location', requireAuth, async (req, res) => {
  try {
    const data = updateDriverLocationSchema.parse(req.body);
    const userId = req.session!.userId!;

    // Update driver profile location
    await db.update(driverProfiles)
      .set({
        currentLatitude: data.latitude.toString(),
        currentLongitude: data.longitude.toString(),
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, userId));

    // Update or insert user location
    const existingLocation = await db.select()
      .from(userLocations)
      .where(eq(userLocations.userId, userId))
      .limit(1);

    if (existingLocation.length > 0) {
      await db.update(userLocations)
        .set({
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString(),
          updatedAt: new Date()
        })
        .where(eq(userLocations.userId, userId));
    } else {
      await db.insert(userLocations).values({
        userId,
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString(),
        isDefault: true
      });
    }

    // Calculate ETA if orderId is provided
    let etaMinutes = null;
    let distanceKm = null;

    if (data.orderId) {
      const order = await db.select()
        .from(orders)
        .where(eq(orders.id, parseInt(data.orderId)))
        .limit(1);

      if (order.length > 0 && order[0].deliveryLatitude && order[0].deliveryLongitude) {
        const deliveryLat = parseFloat(order[0].deliveryLatitude);
        const deliveryLng = parseFloat(order[0].deliveryLongitude);
        
        distanceKm = calculateDistance(data.latitude, data.longitude, deliveryLat, deliveryLng);
        etaMinutes = Math.round((distanceKm / 25) * 60); // 25 km/h average city speed
      }
    }

    // Broadcast real-time updates
    const locationUpdate = {
      driverId: userId,
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading,
      speed: data.speed,
      timestamp: Date.now(),
      eta: etaMinutes ? `${etaMinutes} minutes` : null,
      distance: distanceKm ? `${distanceKm.toFixed(1)} km` : null
    };

    if (global.io) {
      // Notify specific order
      if (data.orderId) {
        global.io.to(`order_${data.orderId}`).emit('driver_location_update', {
          ...locationUpdate,
          orderId: data.orderId
        });

        // Get order details for customer notification
        const orderData = await db.select({
          customerId: orders.customerId,
          customerName: users.fullName
        })
        .from(orders)
        .innerJoin(users, eq(orders.customerId, users.id))
        .where(eq(orders.id, parseInt(data.orderId)))
        .limit(1);

        if (orderData.length > 0) {
          global.io.to(`user_${orderData[0].customerId}`).emit('delivery_eta_update', {
            orderId: data.orderId,
            driverLocation: { lat: data.latitude, lng: data.longitude },
            eta: etaMinutes ? `${etaMinutes} minutes` : 'Calculating...',
            distance: distanceKm ? `${distanceKm.toFixed(1)} km away` : null,
            timestamp: Date.now()
          });
        }
      }

      // Notify admin monitoring
      global.io.to('admin_monitoring').emit('driver_location_update', locationUpdate);

      // Notify live map viewers
      global.io.to('live_map').emit('driver_position_update', {
        driverId: userId,
        position: { lat: data.latitude, lng: data.longitude },
        timestamp: Date.now(),
        orderId: data.orderId
      });
    }

    res.json({
      success: true,
      message: "Location updated successfully",
      location: locationUpdate
    });

  } catch (error: any) {
    console.error('Driver location update error:', error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update location"
    });
  }
});

// Get real-time order tracking
router.get('/order/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderData = await db.select({
      order: orders,
      driver: {
        id: users.id,
        name: users.fullName,
        phone: users.phone,
        rating: driverProfiles.rating,
        vehicleType: driverProfiles.vehicleType,
        plateNumber: driverProfiles.plateNumber
      },
      driverLocation: {
        latitude: driverProfiles.currentLatitude,
        longitude: driverProfiles.currentLongitude,
        lastUpdate: driverProfiles.updatedAt
      }
    })
    .from(orders)
    .leftJoin(users, eq(orders.driverId, users.id))
    .leftJoin(driverProfiles, eq(orders.driverId, driverProfiles.userId))
    .where(eq(orders.id, parseInt(orderId)))
    .limit(1);

    if (orderData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const tracking = orderData[0];
    let eta = null;
    let distance = null;

    if (tracking.driverLocation.latitude && tracking.driverLocation.longitude &&
        tracking.order.deliveryLatitude && tracking.order.deliveryLongitude) {
      
      const distanceKm = calculateDistance(
        parseFloat(tracking.driverLocation.latitude),
        parseFloat(tracking.driverLocation.longitude),
        parseFloat(tracking.order.deliveryLatitude),
        parseFloat(tracking.order.deliveryLongitude)
      );
      
      distance = `${distanceKm.toFixed(1)} km`;
      eta = `${Math.round((distanceKm / 25) * 60)} minutes`;
    }

    res.json({
      success: true,
      tracking: {
        order: tracking.order,
        driver: tracking.driver,
        driverLocation: tracking.driverLocation,
        eta,
        distance,
        lastUpdated: tracking.driverLocation.lastUpdate
      }
    });

  } catch (error: any) {
    console.error('Order tracking error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to get order tracking"
    });
  }
});

// Get live delivery tracking for drivers
router.get('/deliveries/live', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;

    const activeDeliveries = await db.select({
      order: orders,
      customer: {
        name: users.fullName,
        phone: users.phone
      }
    })
    .from(orders)
    .innerJoin(users, eq(orders.customerId, users.id))
    .where(and(
      eq(orders.driverId, userId),
      eq(orders.status, 'IN_PROGRESS')
    ));

    const liveDeliveries = activeDeliveries.map(delivery => ({
      ...delivery.order,
      customer: delivery.customer,
      estimatedTime: delivery.order.estimatedPreparationTime || 30,
      lastUpdated: new Date().toISOString()
    }));

    res.json({
      success: true,
      deliveries: liveDeliveries
    });

  } catch (error: any) {
    console.error('Live deliveries error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to get live deliveries"
    });
  }
});

// Get all active drivers for admin monitoring
router.get('/drivers/active', requireAuth, async (req, res) => {
  try {
    const activeDrivers = await db.select({
      driverId: driverProfiles.userId,
      driverName: users.fullName,
      phone: users.phone,
      latitude: driverProfiles.currentLatitude,
      longitude: driverProfiles.currentLongitude,
      isAvailable: driverProfiles.isAvailable,
      vehicleType: driverProfiles.vehicleType,
      rating: driverProfiles.rating,
      lastUpdate: driverProfiles.updatedAt,
      totalTrips: driverProfiles.totalTrips
    })
    .from(driverProfiles)
    .innerJoin(users, eq(driverProfiles.userId, users.id))
    .where(and(
      eq(users.isActive, true),
      eq(users.role, 'DRIVER')
    ));

    const driversWithStatus = activeDrivers.map(driver => ({
      ...driver,
      status: driver.isAvailable ? 'AVAILABLE' : 'BUSY',
      batteryLevel: Math.floor(Math.random() * 40) + 60, // Real battery would come from app
      signalStrength: Math.floor(Math.random() * 30) + 70,
      distance: driver.latitude && driver.longitude ? 
        calculateDistance(6.5244, 3.3792, parseFloat(driver.latitude), parseFloat(driver.longitude)) : null
    }));

    res.json({
      success: true,
      drivers: driversWithStatus
    });

  } catch (error: any) {
    console.error('Active drivers error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to get active drivers"
    });
  }
});

// Calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default router;
