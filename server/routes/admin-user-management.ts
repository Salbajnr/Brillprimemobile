
import { Router } from 'express';
import { db } from '../db';
import { users, orders, transactions, verificationDocuments } from '../../shared/schema';
import { eq, like, desc, count, sum, gte, lte, and, or, isNotNull } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Export the registration function
export function registerAdminUserManagementRoutes(app: any) {
  app.use('/api/admin/users', router);
}

// Get all users with filtering, searching, and pagination
router.get('/users', requireAuth, async (req, res) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      role = '', 
      status = '',
      verificationStatus = ''
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    
    // Build dynamic where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.phone, `%${search}%`)
        )
      );
    }
    
    if (role && role !== 'ALL') {
      conditions.push(eq(users.role, role as string));
    }
    
    if (status && status !== 'ALL') {
      conditions.push(eq(users.status, status as string));
    }

    if (verificationStatus && verificationStatus !== 'ALL') {
      conditions.push(eq(users.verificationStatus, verificationStatus as string));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get users with pagination
    const userList = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        verificationStatus: users.verificationStatus,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        totalOrders: count(orders.id),
        totalSpent: sum(transactions.amount),
        kycStatus: users.kycStatus
      })
      .from(users)
      .leftJoin(orders, eq(users.id, orders.userId))
      .leftJoin(transactions, eq(users.id, transactions.userId))
      .where(whereClause)
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    // Get statistics
    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [activeUsers] = await db.select({ count: count() })
      .from(users)
      .where(eq(users.status, 'ACTIVE'));
    const [verifiedUsers] = await db.select({ count: count() })
      .from(users)
      .where(eq(users.verificationStatus, 'VERIFIED'));
    const [pendingKyc] = await db.select({ count: count() })
      .from(users)
      .where(eq(users.kycStatus, 'PENDING'));

    res.json({
      success: true,
      data: {
        users: userList,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalResult.count,
          pages: Math.ceil(totalResult.count / Number(limit))
        },
        stats: {
          totalUsers: totalUsers.count,
          activeUsers: activeUsers.count,
          verifiedUsers: verifiedUsers.count,
          pendingKyc: pendingKyc.count
        }
      }
    });

  } catch (error) {
    console.error('Admin user fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get single user details with complete profile
router.get('/users/:userId', requireAuth, async (req, res) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const { userId } = req.params;

    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId)));

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's orders
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, parseInt(userId)))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    // Get user's transactions
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, parseInt(userId)))
      .orderBy(desc(transactions.createdAt))
      .limit(10);

    // Get verification documents
    const verificationDocs = await db
      .select()
      .from(verificationDocuments)
      .where(eq(verificationDocuments.userId, parseInt(userId)));

    // Calculate user statistics
    const [orderStats] = await db
      .select({
        totalOrders: count(orders.id),
        completedOrders: count(orders.id),
        totalSpent: sum(orders.totalAmount)
      })
      .from(orders)
      .where(and(
        eq(orders.userId, parseInt(userId)),
        eq(orders.status, 'DELIVERED')
      ));

    res.json({
      success: true,
      data: {
        user,
        orders: userOrders,
        transactions: userTransactions,
        verificationDocuments: verificationDocs,
        stats: {
          totalOrders: orderStats?.totalOrders || 0,
          completedOrders: orderStats?.completedOrders || 0,
          totalSpent: orderStats?.totalSpent || 0
        }
      }
    });

  } catch (error) {
    console.error('Admin user detail fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details'
    });
  }
});

// Update user status (suspend, activate, ban)
router.patch('/users/:userId/status', requireAuth, async (req, res) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Update user status
    await db
      .update(users)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(users.id, parseInt(userId)));

    // Log the admin action
    console.log(`Admin ${req.user.id} updated user ${userId} status to ${status}. Reason: ${reason}`);

    res.json({
      success: true,
      message: `User status updated to ${status}`,
      data: { userId, status, reason }
    });

  } catch (error) {
    console.error('Admin user status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// Bulk update user statuses
router.patch('/users/bulk-update', requireAuth, async (req, res) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const { userIds, action, reason } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!['ACTIVATE', 'SUSPEND', 'BAN', 'VERIFY'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }

    let updateData: any = { updatedAt: new Date() };

    switch (action) {
      case 'ACTIVATE':
        updateData.status = 'ACTIVE';
        break;
      case 'SUSPEND':
        updateData.status = 'SUSPENDED';
        break;
      case 'BAN':
        updateData.status = 'BANNED';
        break;
      case 'VERIFY':
        updateData.verificationStatus = 'VERIFIED';
        break;
    }

    // Update multiple users
    for (const userId of userIds) {
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, parseInt(userId)));
    }

    // Log the bulk action
    console.log(`Admin ${req.user.id} performed bulk ${action} on users: ${userIds.join(', ')}. Reason: ${reason}`);

    res.json({
      success: true,
      message: `Bulk ${action.toLowerCase()} completed for ${userIds.length} users`,
      data: { 
        affectedUsers: userIds.length,
        action,
        reason 
      }
    });

  } catch (error) {
    console.error('Admin bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk update'
    });
  }
});

// Get user activity timeline
router.get('/users/:userId/activity', requireAuth, async (req, res) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const { userId } = req.params;

    // Get recent orders
    const recentOrders = await db
      .select({
        id: orders.id,
        type: 'ORDER' as const,
        description: orders.status,
        amount: orders.totalAmount,
        timestamp: orders.createdAt
      })
      .from(orders)
      .where(eq(orders.userId, parseInt(userId)))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: transactions.id,
        type: 'TRANSACTION' as const,
        description: transactions.type,
        amount: transactions.amount,
        timestamp: transactions.createdAt
      })
      .from(transactions)
      .where(eq(transactions.userId, parseInt(userId)))
      .orderBy(desc(transactions.createdAt))
      .limit(20);

    // Combine and sort by timestamp
    const activity = [...recentOrders, ...recentTransactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30);

    res.json({
      success: true,
      data: { activity }
    });

  } catch (error) {
    console.error('Admin user activity fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity'
    });
  }
});

export default router;
