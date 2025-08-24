
import express from 'express';
import { db } from '../db';
import { db } from '../db';

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
        websocket: process.env.WEBSOCKET_URL || 'ws://0.0.0.0:5000',
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
