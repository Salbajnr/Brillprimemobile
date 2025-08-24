import express from 'express';
import { db } from '../db';
import { driverProfiles, users, orders } from '../../shared/schema';
import { eq, desc, and, or, count, sql, gte } from 'drizzle-orm';

const router = express.Router();

// GET /api/drivers - Get all drivers (admin) or driver profile (driver)
router.get('/', async (req, res) => {
  try {
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole === 'ADMIN') {
      // Admin can see all drivers
      const allDrivers = await db
        .select({
          id: driverProfiles.id,
          userId: driverProfiles.userId,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          vehicleType: driverProfiles.vehicleType,
          vehicleModel: driverProfiles.vehicleModel,
          plateNumber: driverProfiles.plateNumber,
          isAvailable: driverProfiles.isAvailable,
          rating: driverProfiles.rating,
          totalTrips: driverProfiles.totalTrips,
          earnings: driverProfiles.earnings,
          kycStatus: driverProfiles.kycStatus,
          verificationLevel: driverProfiles.verificationLevel,
          createdAt: driverProfiles.createdAt
        })
        .from(driverProfiles)
        .leftJoin(users, eq(driverProfiles.userId, users.id))
        .orderBy(desc(driverProfiles.createdAt));

      res.json({
        success: true,
        drivers: allDrivers
      });

    } else if (userRole === 'DRIVER') {
      // Driver can see their own profile
      const [driverProfile] = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, userId))
        .limit(1);

      if (!driverProfile) {
        return res.status(404).json({
          success: false,
          message: 'Driver profile not found'
        });
      }

      res.json({
        success: true,
        driver: driverProfile
      });

    } else {
      // Other users can see available drivers for ordering
      const availableDrivers = await db
        .select({
          id: driverProfiles.id,
          userId: driverProfiles.userId,
          fullName: users.fullName,
          vehicleType: driverProfiles.vehicleType,
          vehicleModel: driverProfiles.vehicleModel,
          rating: driverProfiles.rating,
          totalTrips: driverProfiles.totalTrips,
          currentLatitude: driverProfiles.currentLatitude,
          currentLongitude: driverProfiles.currentLongitude
        })
        .from(driverProfiles)
        .leftJoin(users, eq(driverProfiles.userId, users.id))
        .where(and(
          eq(driverProfiles.isAvailable, true),
          eq(driverProfiles.kycStatus, 'APPROVED')
        ))
        .orderBy(desc(driverProfiles.rating));

      res.json({
        success: true,
        drivers: availableDrivers
      });
    }

  } catch (error: any) {
    console.error('Drivers fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drivers'
    });
  }
});

// POST /api/drivers - Create or update driver profile
router.post('/', async (req, res) => {
  try {
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole !== 'DRIVER' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can create driver profiles'
      });
    }

    const {
      vehicleType,
      vehicleModel,
      plateNumber,
      licenseNumber,
      licenseExpiry,
      vehicleYear,
      vehicleColor,
      kycData
    } = req.body;

    // Check if driver profile already exists
    const [existingProfile] = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, userId))
      .limit(1);

    if (existingProfile) {
      // Update existing profile
      const [updatedProfile] = await db
        .update(driverProfiles)
        .set({
          vehicleType,
          vehicleModel,
          plateNumber,
          licenseNumber,
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
          vehicleYear,
          vehicleColor,
          kycData,
          updatedAt: new Date()
        })
        .where(eq(driverProfiles.userId, userId))
        .returning();

      res.json({
        success: true,
        driver: updatedProfile
      });
    } else {
      // Create new profile
      const [newProfile] = await db
        .insert(driverProfiles)
        .values({
          userId,
          vehicleType,
          vehicleModel,
          plateNumber,
          licenseNumber,
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
          vehicleYear,
          vehicleColor,
          kycData,
          isAvailable: true,
          rating: 5.00,
          totalTrips: 0,
          earnings: 0.00,
          kycStatus: 'PENDING',
          verificationLevel: 'BASIC',
          backgroundCheckStatus: 'PENDING'
        })
        .returning();

      res.status(201).json({
        success: true,
        driver: newProfile
      });
    }

  } catch (error: any) {
    console.error('Driver profile creation/update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create/update driver profile'
    });
  }
});

// PUT /api/drivers/:id - Update driver profile (admin) or own profile (driver)
router.put('/:id', async (req, res) => {
  try {
    const driverId = parseInt(req.params.id);
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user has permission to update this profile
    const [existingProfile] = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.id, driverId))
      .limit(1);

    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const canUpdate = 
      userRole === 'ADMIN' || 
      (userRole === 'DRIVER' && existingProfile.userId === userId);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      vehicleType,
      vehicleModel,
      plateNumber,
      licenseNumber,
      licenseExpiry,
      vehicleYear,
      vehicleColor,
      isAvailable,
      currentLatitude,
      currentLongitude,
      kycStatus,
      verificationLevel,
      backgroundCheckStatus
    } = req.body;

    const updateData: any = { updatedAt: new Date() };

    // Fields that drivers can update
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType;
    if (vehicleModel !== undefined) updateData.vehicleModel = vehicleModel;
    if (plateNumber !== undefined) updateData.plateNumber = plateNumber;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (licenseExpiry !== undefined) updateData.licenseExpiry = licenseExpiry ? new Date(licenseExpiry) : null;
    if (vehicleYear !== undefined) updateData.vehicleYear = vehicleYear;
    if (vehicleColor !== undefined) updateData.vehicleColor = vehicleColor;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (currentLatitude !== undefined) updateData.currentLatitude = currentLatitude;
    if (currentLongitude !== undefined) updateData.currentLongitude = currentLongitude;

    // Fields that only admins can update
    if (userRole === 'ADMIN') {
      if (kycStatus !== undefined) updateData.kycStatus = kycStatus;
      if (verificationLevel !== undefined) updateData.verificationLevel = verificationLevel;
      if (backgroundCheckStatus !== undefined) updateData.backgroundCheckStatus = backgroundCheckStatus;
    }

    const [updatedProfile] = await db
      .update(driverProfiles)
      .set(updateData)
      .where(eq(driverProfiles.id, driverId))
      .returning();

    res.json({
      success: true,
      driver: updatedProfile
    });

  } catch (error: any) {
    console.error('Driver profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver profile'
    });
  }
});

// GET /api/drivers/location - Get driver locations for real-time tracking
router.get('/location', async (req, res) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { driverIds } = req.query;
    let whereClause = eq(driverProfiles.isAvailable, true);

    if (driverIds) {
      const ids = (driverIds as string).split(',').map(id => parseInt(id));
      whereClause = and(whereClause, sql`${driverProfiles.id} = ANY(${ids})`);
    }

    const driverLocations = await db
      .select({
        id: driverProfiles.id,
        userId: driverProfiles.userId,
        fullName: users.fullName,
        currentLatitude: driverProfiles.currentLatitude,
        currentLongitude: driverProfiles.currentLongitude,
        vehicleType: driverProfiles.vehicleType,
        vehicleModel: driverProfiles.vehicleModel,
        plateNumber: driverProfiles.plateNumber,
        rating: driverProfiles.rating,
        isAvailable: driverProfiles.isAvailable
      })
      .from(driverProfiles)
      .leftJoin(users, eq(driverProfiles.userId, users.id))
      .where(whereClause);

    res.json({
      success: true,
      locations: driverLocations
    });

  } catch (error: any) {
    console.error('Driver location fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver locations'
    });
  }
});

// POST /api/drivers/location - Update driver location
router.post('/location', async (req, res) => {
  try {
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    if (!userId || userRole !== 'DRIVER') {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can update location'
      });
    }

    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const [updatedProfile] = await db
      .update(driverProfiles)
      .set({
        currentLatitude: latitude,
        currentLongitude: longitude,
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, userId))
      .returning();

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    res.json({
      success: true,
      location: {
        latitude: updatedProfile.currentLatitude,
        longitude: updatedProfile.currentLongitude
      }
    });

  } catch (error: any) {
    console.error('Driver location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
});

// GET /api/drivers/stats - Get driver statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (userRole === 'DRIVER') {
      // Get stats for specific driver
      const [driverProfile] = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, userId))
        .limit(1);

      if (!driverProfile) {
        return res.status(404).json({
          success: false,
          message: 'Driver profile not found'
        });
      }

      const [completedTrips] = await db
        .select({ count: count() })
        .from(orders)
        .where(and(
          eq(orders.driverId, userId),
          eq(orders.status, 'DELIVERED')
        ));

      const [monthlyTrips] = await db
        .select({ count: count() })
        .from(orders)
        .where(and(
          eq(orders.driverId, userId),
          eq(orders.status, 'DELIVERED'),
          gte(orders.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        ));

      res.json({
        success: true,
        stats: {
          totalTrips: completedTrips.count,
          monthlyTrips: monthlyTrips.count,
          earnings: driverProfile.earnings,
          rating: driverProfile.rating,
          isAvailable: driverProfile.isAvailable
        }
      });

    } else if (userRole === 'ADMIN') {
      // Get platform-wide driver stats
      const [totalDrivers] = await db
        .select({ count: count() })
        .from(driverProfiles);

      const [activeDrivers] = await db
        .select({ count: count() })
        .from(driverProfiles)
        .where(eq(driverProfiles.isAvailable, true));

      const [verifiedDrivers] = await db
        .select({ count: count() })
        .from(driverProfiles)
        .where(eq(driverProfiles.kycStatus, 'APPROVED'));

      res.json({
        success: true,
        stats: {
          total: totalDrivers.count,
          active: activeDrivers.count,
          verified: verifiedDrivers.count
        }
      });

    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

  } catch (error: any) {
    console.error('Driver stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver statistics'
    });
  }
});

export default router;