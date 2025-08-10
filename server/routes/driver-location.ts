
import { Router } from 'express';
import { db } from '../db';
import { driverProfiles, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Get current driver location
router.get('/current', async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get driver's current location
    const [driver] = await db.select()
      .from(driverProfiles)
      .innerJoin(users, eq(driverProfiles.userId, users.id))
      .where(eq(driverProfiles.userId, userId))
      .limit(1);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const location = {
      lat: parseFloat(driver.driver_profiles.currentLatitude || '6.5244'),
      lng: parseFloat(driver.driver_profiles.currentLongitude || '3.3792'),
      address: "Current Location", // This could be reverse geocoded
      lastUpdate: driver.driver_profiles.updatedAt.toISOString()
    };

    res.json({
      success: true,
      location
    });

  } catch (error) {
    console.error('Error fetching driver location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location'
    });
  }
});

// Update driver location
router.post('/update', async (req, res) => {
  try {
    const userId = req.session?.userId;
    const { latitude, longitude } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Update driver location
    await db.update(driverProfiles)
      .set({
        currentLatitude: latitude.toString(),
        currentLongitude: longitude.toString(),
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, userId));

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
});

export default router;
