
import { Router } from 'express';
import { db } from '../db';
import { driverProfiles, users, userLocations } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

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

    // Get driver's current location with real-time data
    const [driver] = await db.select({
      driver: driverProfiles,
      user: users,
      location: userLocations
    })
    .from(driverProfiles)
    .innerJoin(users, eq(driverProfiles.userId, users.id))
    .leftJoin(userLocations, eq(users.id, userLocations.userId))
    .where(eq(driverProfiles.userId, userId))
    .limit(1);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    // Use most recent location data
    const latitude = driver.driver.currentLatitude || driver.location?.latitude || '6.5244';
    const longitude = driver.driver.currentLongitude || driver.location?.longitude || '3.3792';

    const location = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
      address: await reverseGeocode(parseFloat(latitude), parseFloat(longitude)),
      lastUpdate: driver.driver.updatedAt.toISOString(),
      isAvailable: driver.driver.isAvailable,
      vehicleType: driver.driver.vehicleType,
      rating: parseFloat(driver.driver.rating || '5.0')
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

// Update driver location with enhanced tracking
router.post('/update', async (req, res) => {
  try {
    const userId = req.session?.userId;
    const { latitude, longitude, heading, speed, accuracy } = req.body;
    
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

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const now = new Date();

    // Update driver profile location
    await db.update(driverProfiles)
      .set({
        currentLatitude: latitude.toString(),
        currentLongitude: longitude.toString(),
        updatedAt: now
      })
      .where(eq(driverProfiles.userId, userId));

    // Update or create user location record
    const existingLocation = await db.select()
      .from(userLocations)
      .where(eq(userLocations.userId, userId))
      .limit(1);

    if (existingLocation.length > 0) {
      await db.update(userLocations)
        .set({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          updatedAt: now
        })
        .where(eq(userLocations.userId, userId));
    } else {
      await db.insert(userLocations).values({
        userId,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        address: await reverseGeocode(latitude, longitude),
        isDefault: true
      });
    }

    // Broadcast real-time location update
    if (global.io) {
      const locationUpdate = {
        driverId: userId,
        latitude,
        longitude,
        heading,
        speed,
        accuracy,
        timestamp: now.getTime()
      };

      // Emit to various channels
      global.io.to(`driver_${userId}`).emit('location_update_confirmed', locationUpdate);
      global.io.to('admin_monitoring').emit('driver_location_update', locationUpdate);
      global.io.to('live_map').emit('driver_position_update', locationUpdate);
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: {
        latitude,
        longitude,
        heading,
        speed,
        timestamp: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
});

// Get driver availability status
router.get('/status', async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const [driver] = await db.select({
      isAvailable: driverProfiles.isAvailable,
      rating: driverProfiles.rating,
      totalTrips: driverProfiles.totalTrips,
      earnings: driverProfiles.earnings,
      vehicleType: driverProfiles.vehicleType,
      lastUpdate: driverProfiles.updatedAt
    })
    .from(driverProfiles)
    .where(eq(driverProfiles.userId, userId))
    .limit(1);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    // Calculate if driver is considered online (updated within last 5 minutes)
    const isOnline = (Date.now() - driver.lastUpdate.getTime()) < 5 * 60 * 1000;

    res.json({
      success: true,
      status: {
        isAvailable: driver.isAvailable,
        isOnline,
        rating: parseFloat(driver.rating || '5.0'),
        totalTrips: driver.totalTrips,
        earnings: parseFloat(driver.earnings || '0'),
        vehicleType: driver.vehicleType,
        lastUpdate: driver.lastUpdate.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching driver status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status'
    });
  }
});

// Toggle driver availability
router.post('/toggle-availability', async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const [currentStatus] = await db.select({ isAvailable: driverProfiles.isAvailable })
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, userId))
      .limit(1);

    if (!currentStatus) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const newStatus = !currentStatus.isAvailable;

    await db.update(driverProfiles)
      .set({
        isAvailable: newStatus,
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, userId));

    // Broadcast availability change
    if (global.io) {
      global.io.to('admin_monitoring').emit('driver_availability_change', {
        driverId: userId,
        isAvailable: newStatus,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `Driver ${newStatus ? 'available' : 'unavailable'}`,
      isAvailable: newStatus
    });

  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle availability'
    });
  }
});

// Simple reverse geocoding function (in production, use Google Maps API)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // Check if Google Maps API key is available
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (googleApiKey) {
      try {
        // Use Google Maps Geocoding API
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            // Extract meaningful address components
            const addressComponents = result.address_components;
            const locality = addressComponents.find((comp: any) => 
              comp.types.includes('locality') || comp.types.includes('sublocality')
            )?.long_name;
            const state = addressComponents.find((comp: any) => 
              comp.types.includes('administrative_area_level_1')
            )?.long_name;
            
            return locality && state ? `${locality}, ${state}` : result.formatted_address;
          }
        }
      } catch (apiError) {
        console.warn('Google Maps API error, falling back to local detection:', apiError);
      }
    }
    
    // Enhanced fallback to local area detection for Nigerian locations
    const areas = [
      { name: "Victoria Island", lat: 6.4281, lng: 3.4106, radius: 3 },
      { name: "Ikeja", lat: 6.5958, lng: 3.3390, radius: 5 },
      { name: "Lekki", lat: 6.4474, lng: 3.4736, radius: 8 },
      { name: "Lagos Island", lat: 6.4541, lng: 3.3947, radius: 2 },
      { name: "Surulere", lat: 6.4969, lng: 3.3614, radius: 4 },
      { name: "Yaba", lat: 6.5158, lng: 3.3744, radius: 3 },
      { name: "Maryland", lat: 6.5631, lng: 3.3673, radius: 2 },
      { name: "Gbagada", lat: 6.5447, lng: 3.3920, radius: 3 },
      { name: "Ajah", lat: 6.4698, lng: 3.5582, radius: 5 },
      { name: "Ikoyi", lat: 6.4420, lng: 3.4348, radius: 2 }
    ];

    for (const area of areas) {
      const distance = Math.sqrt(
        Math.pow(lat - area.lat, 2) + Math.pow(lng - area.lng, 2)
      ) * 111; // Rough km conversion

      if (distance <= area.radius) {
        return area.name + ", Lagos";
      }
    }

    // Enhanced fallback based on coordinate ranges
    if (lat >= 6.2 && lat <= 6.8 && lng >= 3.0 && lng <= 3.7) {
      return "Lagos, Nigeria";
    } else if (lat >= 9.0 && lat <= 9.2 && lng >= 7.4 && lng <= 7.6) {
      return "Abuja, FCT";
    } else if (lat >= 7.3 && lat <= 7.5 && lng >= 3.8 && lng <= 4.0) {
      return "Ibadan, Oyo";
    } else if (lat >= 12.0 && lat <= 12.2 && lng >= 8.5 && lng <= 8.7) {
      return "Kano, Kano";
    }
    
    return "Nigeria";
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return "Current Location";
  }
}

export default router;
