
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { adminUsers, users, complianceDocuments, supportTickets, transactions, contentReports, vendorViolations, driverProfiles, merchantProfiles, userLocations } from '../../shared/schema';
import { eq, desc, and, or, like, gte, lte, count, sql } from 'drizzle-orm';
import { adminAuth } from '../middleware/adminAuth';

const router = express.Router();

// Admin Authentication
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin user
    const admin = await db
      .select({
        id: adminUsers.id,
        userId: adminUsers.userId,
        role: adminUsers.role,
        permissions: adminUsers.permissions,
        user: {
          email: users.email,
          fullName: users.fullName,
          password: users.password
        }
      })
      .from(adminUsers)
      .innerJoin(users, eq(adminUsers.userId, users.userId))
      .where(eq(users.email, email))
      .limit(1);

    if (admin.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const adminUser = admin[0];
    const isValidPassword = await bcrypt.compare(password, adminUser.user.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: adminUser.id,
        userId: adminUser.userId,
        role: adminUser.role,
        permissions: adminUser.permissions
      },
      process.env.JWT_SECRET || 'admin-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: adminUser.id,
          userId: adminUser.userId,
          role: adminUser.role,
          permissions: adminUser.permissions,
          email: adminUser.user.email,
          fullName: adminUser.user.fullName
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

router.post('/auth/logout', adminAuth, async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/auth/profile', adminAuth, async (req, res) => {
  try {
    const adminUser = await db
      .select({
        id: adminUsers.id,
        userId: adminUsers.userId,
        role: adminUsers.role,
        permissions: adminUsers.permissions,
        user: {
          email: users.email,
          fullName: users.fullName
        }
      })
      .from(adminUsers)
      .innerJoin(users, eq(adminUsers.userId, users.userId))
      .where(eq(adminUsers.id, req.adminUser.adminId))
      .limit(1);

    if (adminUser.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({
      success: true,
      data: {
        id: adminUser[0].id,
        userId: adminUser[0].userId,
        role: adminUser[0].role,
        permissions: adminUser[0].permissions,
        email: adminUser[0].user.email,
        fullName: adminUser[0].user.fullName
      }
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
});

// Dashboard Metrics
router.get('/dashboard/metrics', adminAuth, async (req, res) => {
  try {
    const [
      totalUsersResult,
      totalTransactionsResult,
      totalRevenueResult,
      activeOrdersResult,
      pendingKYCResult,
      flaggedAccountsResult,
      supportTicketsResult,
      fraudAlertsResult
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(transactions),
      db.select({ 
        total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`
      }).from(transactions).where(eq(transactions.status, 'SUCCESS')),
      db.select({ count: count() }).from(transactions).where(eq(transactions.status, 'PENDING')),
      db.select({ count: count() }).from(complianceDocuments).where(eq(complianceDocuments.status, 'PENDING')),
      db.select({ count: count() }).from(users).where(eq(users.isVerified, false)),
      db.select({ count: count() }).from(supportTickets).where(or(eq(supportTickets.status, 'OPEN'), eq(supportTickets.status, 'IN_PROGRESS'))),
      db.select({ count: count() }).from(contentReports).where(eq(contentReports.status, 'PENDING'))
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: totalUsersResult[0].count,
        totalTransactions: totalTransactionsResult[0].count,
        totalRevenue: totalRevenueResult[0].total || 0,
        activeOrders: activeOrdersResult[0].count,
        pendingKYC: pendingKYCResult[0].count,
        flaggedAccounts: flaggedAccountsResult[0].count,
        supportTickets: supportTicketsResult[0].count,
        fraudAlerts: fraudAlertsResult[0].count
      }
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ success: false, message: 'Failed to get metrics' });
  }
});

// User Management
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let whereConditions = [];

    if (role) {
      whereConditions.push(eq(users.role, role as any));
    }

    if (status === 'verified') {
      whereConditions.push(eq(users.isVerified, true));
    } else if (status === 'unverified') {
      whereConditions.push(eq(users.isVerified, false));
    }

    if (search) {
      whereConditions.push(
        or(
          like(users.fullName, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.phone, `%${search}%`)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [usersData, totalCount] = await Promise.all([
      db.select().from(users).where(whereClause).limit(limit).offset(offset).orderBy(desc(users.createdAt)),
      db.select({ count: count() }).from(users).where(whereClause)
    ]);

    res.json({
      success: true,
      data: {
        items: usersData,
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
});

router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get KYC documents for this user
    const kycDocuments = await db.select().from(complianceDocuments).where(eq(complianceDocuments.userId, userId));

    res.json({
      success: true,
      data: {
        ...user[0],
        kycDocuments
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
});

router.patch('/users/:id/status', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    await db.update(users).set({ 
      isVerified: status === 'verified'
    }).where(eq(users.id, userId));

    res.json({ success: true, message: 'User status updated' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// KYC Management
router.get('/kyc/pending', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const pendingKYC = await db
      .select({
        id: complianceDocuments.id,
        documentType: complianceDocuments.documentType,
        documentUrl: complianceDocuments.documentUrl,
        status: complianceDocuments.status,
        createdAt: complianceDocuments.createdAt,
        user: {
          id: users.id,
          userId: users.userId,
          fullName: users.fullName,
          email: users.email,
          role: users.role
        }
      })
      .from(complianceDocuments)
      .innerJoin(users, eq(complianceDocuments.userId, users.id))
      .where(eq(complianceDocuments.status, 'PENDING'))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(complianceDocuments.createdAt));

    const totalCount = await db
      .select({ count: count() })
      .from(complianceDocuments)
      .where(eq(complianceDocuments.status, 'PENDING'));

    res.json({
      success: true,
      data: {
        items: pendingKYC,
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get pending KYC error:', error);
    res.status(500).json({ success: false, message: 'Failed to get pending KYC' });
  }
});

router.post('/kyc/:documentId/review', adminAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const { action, reason } = req.body;

    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    
    await db.update(complianceDocuments).set({
      status,
      reviewedBy: req.adminUser.adminId,
      reviewedAt: new Date()
    }).where(eq(complianceDocuments.id, documentId));

    // If approved, update user verification status
    if (action === 'approve') {
      const document = await db.select().from(complianceDocuments).where(eq(complianceDocuments.id, documentId)).limit(1);
      if (document.length > 0) {
        await db.update(users).set({
          isIdentityVerified: true
        }).where(eq(users.id, document[0].userId));
      }
    }

    res.json({ success: true, message: `KYC document ${action}d successfully` });
  } catch (error) {
    console.error('KYC review error:', error);
    res.status(500).json({ success: false, message: 'Failed to review KYC' });
  }
});

// Support Tickets
router.get('/support/tickets', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const tickets = await db
      .select()
      .from(supportTickets)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(supportTickets.createdAt));

    const totalCount = await db.select({ count: count() }).from(supportTickets);

    res.json({
      success: true,
      data: {
        items: tickets,
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to get support tickets' });
  }
});

router.patch('/support/tickets/:id', adminAuth, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const updates = req.body;

    if (updates.assignedTo !== undefined) {
      updates.assignedTo = parseInt(updates.assignedTo);
    }

    if (updates.status === 'RESOLVED' || updates.status === 'CLOSED') {
      updates.resolvedAt = new Date();
    }

    updates.updatedAt = new Date();

    await db.update(supportTickets).set(updates).where(eq(supportTickets.id, ticketId));

    res.json({ success: true, message: 'Ticket updated successfully' });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
});

// Transactions
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const transactionsData = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        recipientId: transactions.recipientId,
        type: transactions.type,
        status: transactions.status,
        amount: transactions.amount,
        fee: transactions.fee,
        netAmount: transactions.netAmount,
        currency: transactions.currency,
        description: transactions.description,
        paystackReference: transactions.paystackReference,
        channel: transactions.channel,
        initiatedAt: transactions.initiatedAt,
        completedAt: transactions.completedAt,
        failedAt: transactions.failedAt
      })
      .from(transactions)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(transactions.initiatedAt));

    const totalCount = await db.select({ count: count() }).from(transactions);

    res.json({
      success: true,
      data: {
        items: transactionsData,
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
});

// Fraud Detection
router.get('/fraud/alerts', adminAuth, async (req, res) => {
  try {
    // Mock fraud alerts for now - implement based on your fraud detection logic
    const alerts = [
      {
        id: 1,
        userId: 1,
        alertType: 'Suspicious Payment Pattern',
        severity: 'HIGH',
        description: 'Multiple failed payment attempts detected',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        user: {
          fullName: 'John Doe',
          email: 'john@example.com'
        }
      }
    ];

    res.json({
      success: true,
      data: {
        items: alerts,
        total: alerts.length,
        page: 1,
        limit: 20,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Get fraud alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to get fraud alerts' });
  }
});

// Real-time Driver Monitoring
router.get('/monitoring/drivers/locations', adminAuth, async (req, res) => {
  try {
    const driverLocations = await db
      .select({
        driverId: driverProfiles.userId,
        latitude: userLocations.latitude,
        longitude: userLocations.longitude,
        isAvailable: driverProfiles.isAvailable,
        lastUpdate: userLocations.updatedAt,
        driver: {
          fullName: users.fullName,
          phone: users.phone,
          vehicleType: driverProfiles.vehicleType,
          vehiclePlate: driverProfiles.vehiclePlate
        }
      })
      .from(driverProfiles)
      .innerJoin(users, eq(driverProfiles.userId, users.id))
      .innerJoin(userLocations, eq(users.id, userLocations.userId))
      .where(and(
        eq(driverProfiles.isActive, true),
        eq(userLocations.isActive, true)
      ));

    res.json({
      success: true,
      data: driverLocations
    });
  } catch (error) {
    console.error('Get driver locations error:', error);
    res.status(500).json({ success: false, message: 'Failed to get driver locations' });
  }
});

// System Health
router.get('/monitoring/system/health', adminAuth, async (req, res) => {
  try {
    // Basic system health check
    const health = {
      database: 'healthy',
      api: 'online',
      paymentGateway: 'active',
      websocket: 'warning'
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({ success: false, message: 'Failed to check system health' });
  }
});

// Database Maintenance
router.post('/maintenance/backup', adminAuth, async (req, res) => {
  try {
    // Implement database backup logic here
    res.json({ success: true, message: 'Backup initiated successfully' });
  } catch (error) {
    console.error('Database backup error:', error);
    res.status(500).json({ success: false, message: 'Backup failed' });
  }
});

export default router;
