
import { Express } from 'express';
import { z } from 'zod';
import { adminAuth } from '../middleware/adminAuth';
import { storage } from '../storage';
import { sanitizeInput, validateSchema } from '../middleware/validation';

const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN']).optional(),
  isVerified: z.boolean().optional()
});

const bulkUpdateSchema = z.object({
  userIds: z.array(z.number()),
  updates: z.object({
    isActive: z.boolean().optional(),
    role: z.enum(['CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN']).optional(),
    isVerified: z.boolean().optional()
  })
});

export function registerAdminUserManagementRoutes(app: Express) {
  // Get all users with filtering and pagination
  app.get("/api/admin/users", adminAuth, async (req, res) => {
    try {
      const filters = {
        page: req.query.page as string,
        limit: req.query.limit as string,
        role: req.query.role as string,
        status: req.query.status as string,
        search: req.query.search as string
      };

      const result = await storage.getAllUsers(filters);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users'
      });
    }
  });

  // Get user statistics
  app.get("/api/admin/users/stats", adminAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user statistics'
      });
    }
  });

  // Get specific user details
  app.get("/api/admin/users/:userId", adminAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }

      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Get user details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user details'
      });
    }
  });

  // Update user status (activate/deactivate)
  app.patch("/api/admin/users/:userId/status", adminAuth, [
    sanitizeInput(),
    validateSchema(z.object({ isActive: z.boolean() })),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const { isActive } = req.body;

        if (isNaN(userId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid user ID'
          });
        }

        const updatedUser = await storage.updateUserStatus(userId, isActive);

        // Notify user via WebSocket
        if (global.io) {
          global.io.to(`user_${userId}`).emit('account_status_update', {
            type: 'ACCOUNT_STATUS_CHANGED',
            isActive,
            message: isActive ? 'Your account has been activated' : 'Your account has been deactivated',
            timestamp: Date.now()
          });
        }

        res.json({
          success: true,
          message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
          data: updatedUser
        });

      } catch (error: any) {
        console.error('Update user status error:', error);
        if (error.name === 'ZodError') {
          return res.status(400).json({
            success: false,
            message: 'Invalid request data',
            errors: error.errors
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to update user status'
        });
      }
    }
  ]);

  // Update user role
  app.patch("/api/admin/users/:userId/role", adminAuth, [
    sanitizeInput(),
    validateSchema(z.object({ role: z.enum(['CONSUMER', 'MERCHANT', 'DRIVER', 'ADMIN']) })),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const { role } = req.body;

        if (isNaN(userId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid user ID'
          });
        }

        const updatedUser = await storage.updateUserRole(userId, role);

        // Notify user via WebSocket
        if (global.io) {
          global.io.to(`user_${userId}`).emit('role_update', {
            type: 'ROLE_CHANGED',
            newRole: role,
            message: `Your role has been updated to ${role}`,
            timestamp: Date.now()
          });
        }

        res.json({
          success: true,
          message: `User role updated to ${role} successfully`,
          data: updatedUser
        });

      } catch (error: any) {
        console.error('Update user role error:', error);
        if (error.name === 'ZodError') {
          return res.status(400).json({
            success: false,
            message: 'Invalid role data',
            errors: error.errors
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to update user role'
        });
      }
    }
  ]);

  // Verify user
  app.patch("/api/admin/users/:userId/verify", adminAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }

      const updatedUser = await storage.verifyUser(userId);

      // Notify user via WebSocket
      if (global.io) {
        global.io.to(`user_${userId}`).emit('verification_update', {
          type: 'ACCOUNT_VERIFIED',
          message: 'Your account has been verified',
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: 'User verified successfully',
        data: updatedUser
      });

    } catch (error) {
      console.error('Verify user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify user'
      });
    }
  });

  // Bulk update users
  app.patch("/api/admin/users/bulk-update", adminAuth, [
    sanitizeInput(),
    validateSchema(bulkUpdateSchema),
    async (req, res) => {
      try {
        const { userIds, updates } = req.body;

        const updatedUsers = await storage.bulkUpdateUsers(userIds, updates);

        // Notify affected users via WebSocket
        if (global.io && updates) {
          userIds.forEach((userId: number) => {
            global.io.to(`user_${userId}`).emit('account_update', {
              type: 'BULK_ACCOUNT_UPDATE',
              updates,
              message: 'Your account has been updated by an administrator',
              timestamp: Date.now()
            });
          });
        }

        res.json({
          success: true,
          message: `${updatedUsers.length} users updated successfully`,
          data: { updatedCount: updatedUsers.length }
        });

      } catch (error: any) {
        console.error('Bulk update users error:', error);
        if (error.name === 'ZodError') {
          return res.status(400).json({
            success: false,
            message: 'Invalid bulk update data',
            errors: error.errors
          });
        }
        res.status(500).json({
          success: false,
          message: 'Failed to bulk update users'
        });
      }
    }
  ]);

  // Get user activity summary
  app.get("/api/admin/users/:userId/activity", adminAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }

      // Get user activity data (orders, transactions, etc.)
      const dashboardData = await storage.getConsumerDashboardData(userId);

      res.json({
        success: true,
        data: {
          recentTransactions: dashboardData.recentTransactions,
          recentOrders: dashboardData.recentOrders,
          totalTransactions: dashboardData.totalTransactions,
          totalSpent: dashboardData.totalSpent,
          successRate: dashboardData.successRate
        }
      });

    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user activity'
      });
    }
  });
}
