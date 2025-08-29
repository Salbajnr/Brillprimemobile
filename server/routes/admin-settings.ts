
import express from 'express';
import { db } from '../db';
import { adminAuth, requirePermission } from '../middleware/adminAuth';

const router = express.Router();

// System Settings Management
router.get('/settings/system', adminAuth, requirePermission('SYSTEM_SETTINGS'), async (req, res) => {
  try {
    // Mock system settings - in production, these would come from a settings table
    const systemSettings = {
      platform: {
        maintenanceMode: false,
        registrationEnabled: true,
        maxFileUploadSize: '10MB',
        sessionTimeout: 3600,
        multiFactorAuthRequired: true
      },
      payments: {
        escrowEnabled: true,
        autoReleaseTime: 72, // hours
        maxTransactionAmount: 1000000, // NGN
        minimumWalletBalance: 100
      },
      security: {
        passwordMinLength: 8,
        maxLoginAttempts: 5,
        accountLockoutDuration: 30, // minutes
        fraudDetectionEnabled: true
      },
      notifications: {
        emailNotificationsEnabled: true,
        smsNotificationsEnabled: true,
        pushNotificationsEnabled: true,
        webhookRetryAttempts: 3
      }
    };

    res.json({
      success: true,
      data: systemSettings
    });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get system settings' });
  }
});

// Update System Settings
router.put('/settings/system', adminAuth, requirePermission('SYSTEM_SETTINGS'), async (req, res) => {
  try {
    const { category, settings } = req.body;

    // Validate settings based on category
    if (!['platform', 'payments', 'security', 'notifications'].includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid settings category' });
    }

    // In production, save to database
    console.log(`Admin ${req.adminUser.adminId} updated ${category} settings:`, settings);

    // Broadcast settings update to other admin users
    if (global.io) {
      global.io.to('admin_dashboard').emit('system_settings_updated', {
        category,
        updatedBy: req.adminUser.adminId,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `${category} settings updated successfully`
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update system settings' });
  }
});

// Feature Flags Management
router.get('/settings/feature-flags', adminAuth, async (req, res) => {
  try {
    const featureFlags = {
      fuelDelivery: true,
      commodityOrders: true,
      tollPayments: true,
      realTimeTracking: true,
      advancedAnalytics: true,
      multiLanguageSupport: false,
      voiceCommands: false,
      aiChatbot: false,
      cryptoPayments: false,
      internationalShipping: false
    };

    res.json({
      success: true,
      data: featureFlags
    });
  } catch (error) {
    console.error('Get feature flags error:', error);
    res.status(500).json({ success: false, message: 'Failed to get feature flags' });
  }
});

// Toggle Feature Flag
router.patch('/settings/feature-flags/:flagName', adminAuth, requirePermission('SYSTEM_SETTINGS'), async (req, res) => {
  try {
    const { flagName } = req.params;
    const { enabled } = req.body;

    // In production, update feature flag in database
    console.log(`Feature flag ${flagName} ${enabled ? 'enabled' : 'disabled'} by admin ${req.adminUser.adminId}`);

    res.json({
      success: true,
      message: `Feature flag ${flagName} ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error('Toggle feature flag error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle feature flag' });
  }
});

// API Rate Limits Management
router.get('/settings/rate-limits', adminAuth, async (req, res) => {
  try {
    const rateLimits = {
      authentication: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5 // limit each IP to 5 requests per windowMs
      },
      general: {
        windowMs: 15 * 60 * 1000,
        max: 100
      },
      payments: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10
      },
      uploads: {
        windowMs: 15 * 60 * 1000,
        max: 20
      }
    };

    res.json({
      success: true,
      data: rateLimits
    });
  } catch (error) {
    console.error('Get rate limits error:', error);
    res.status(500).json({ success: false, message: 'Failed to get rate limits' });
  }
});

// Update Rate Limits
router.put('/settings/rate-limits', adminAuth, requirePermission('SYSTEM_SETTINGS'), async (req, res) => {
  try {
    const { category, windowMs, max } = req.body;

    // Validate rate limit parameters
    if (windowMs < 60000 || max < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid rate limit parameters' 
      });
    }

    // In production, update rate limits in configuration
    console.log(`Rate limit for ${category} updated: ${max} requests per ${windowMs}ms`);

    res.json({
      success: true,
      message: `Rate limit for ${category} updated successfully`
    });
  } catch (error) {
    console.error('Update rate limits error:', error);
    res.status(500).json({ success: false, message: 'Failed to update rate limits' });
  }
});

export default router;
