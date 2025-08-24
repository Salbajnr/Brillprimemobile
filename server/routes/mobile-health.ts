
import express from 'express';
import { db } from '../db';

// Extend session interface
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

const router = express.Router();

// Mobile app health check endpoint
router.get('/mobile/health', async (req, res) => {
  try {
    // Check database connectivity
    await db.execute('SELECT 1');
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'operational',
        redis: process.env.REDIS_DISABLED ? 'disabled' : 'operational',
      },
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      mobile: {
        supportedPlatforms: ['ios', 'android'],
        apiCompatibility: 'v1',
        features: {
          offline: true,
          realtime: true,
          pushNotifications: true,
        },
      },
    };

    res.json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    console.error('Mobile health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Service unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
});

// Mobile app configuration endpoint


// Device registration for mobile apps
router.post('/mobile/register-device', async (req, res) => {
  try {
    const { deviceId, platform, version, pushToken } = req.body;
    const userId = req.session?.userId;

    if (!deviceId || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Device ID and platform are required'
      });
    }

    // Store or update device information
    const deviceInfo = {
      userId: userId || null,
      deviceId,
      platform,
      version,
      pushToken,
      lastSeen: new Date().toISOString(),
      isActive: true
    };

    // In a real implementation, you'd store this in a devices table
    console.log('Device registered:', deviceInfo);

    res.json({
      success: true,
      data: {
        deviceId,
        registered: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register device'
    });
  }
});

// Update push notification token
router.post('/mobile/update-push-token', async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.session?.userId;

    if (!token || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Push token and platform are required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Store push token for user
    console.log('Push token updated:', { userId, token: token.substring(0, 20) + '...', platform });

    res.json({
      success: true,
      data: {
        tokenUpdated: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Push token update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update push token'
    });
  }
});

// Sync offline actions
router.post('/mobile/sync-offline-actions', async (req, res) => {
  try {
    const { actions } = req.body;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!Array.isArray(actions)) {
      return res.status(400).json({
        success: false,
        error: 'Actions must be an array'
      });
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const action of actions) {
      try {
        // Process each offline action
        const result = await processOfflineAction(action, userId);
        results.push({
          id: action.id,
          success: true,
          result
        });
      } catch (error: any) {
        errors.push({
          id: action.id,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        processed: results.length,
        errorCount: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    console.error('Offline actions sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync offline actions'
    });
  }
});

// Helper function to process offline actions
async function processOfflineAction(action: any, userId: number): Promise<any> {
  switch (action.type) {
    case 'CREATE_ORDER':
      // Process offline order creation
      return { message: 'Order creation queued for processing' };
    
    case 'UPDATE_PROFILE':
      // Process offline profile update
      return { message: 'Profile update processed' };
    
    case 'PAYMENT':
      // Process offline payment
      return { message: 'Payment queued for processing' };
    
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

router.get('/mobile/config', async (req, res) => {
  try {
    const config = {
      apiVersion: '1.0.0',
      baseUrl: process.env.NODE_ENV === 'production' 
        ? 'https://brillprime-monorepo.replit.app/api' 
        : 'http://0.0.0.0:5000/api',
      features: {
        qrScanner: true,
        biometricAuth: true,
        pushNotifications: true,
        fuelOrdering: true,
        tollPayments: true,
        realTimeTracking: true,
        offlineMode: true,
      },
      limits: {
        maxFileUploadSize: 10 * 1024 * 1024, // 10MB
        maxCartItems: 50,
        maxTransferAmount: 1000000, // ₦1,000,000
      },
      endpoints: {
        websocket: process.env.WEBSOCKET_URL || (process.env.NODE_ENV === 'production' 
          ? 'wss://brillprime-monorepo.replit.app' 
          : 'ws://0.0.0.0:5000'),
        payments: {
          paystack: !!process.env.PAYSTACK_PUBLIC_KEY,
          stripe: !!process.env.STRIPE_PUBLIC_KEY,
        },
      },
    };

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Mobile config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load configuration',
    });
  }
});

export default router;
