import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Dashboard endpoint  
router.get('/', async (req, res) => {
  try {
    // Get basic dashboard data for authenticated user
    const user = req.user;
    
    const dashboardData = {
      user: {
        id: user?.id,
        email: user?.email,
        fullName: user?.fullName,
        role: user?.role
      },
      stats: {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        revenue: 0,
        wallet: {
          balance: 0
        }
      },
      recentOrders: [],
      notifications: []
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load dashboard' 
    });
  }
});

export default router;