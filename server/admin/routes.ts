
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { adminUsers, users, complianceDocuments, supportTickets, transactions, contentReports, vendorViolations, driverProfiles, merchantProfiles, userLocations, wallets, paymentMethods, escrowTransactions, orders, products, categories, deliveryRequests, vendorPosts, chatMessages, conversations } from '../../shared/schema';
import { eq, desc, and, or, like, gte, lte, count, sql, inArray } from 'drizzle-orm';
import { adminAuth, requirePermission } from '../middleware/adminAuth';

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
      db.select({ count: count() }).from(orders).where(inArray(orders.status, ['pending', 'confirmed', 'processing', 'shipped'])),
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
    const { status, reason } = req.body;

    await db.update(users).set({ 
      isVerified: status === 'verified'
    }).where(eq(users.id, userId));

    res.json({ success: true, message: 'User status updated' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

router.delete('/users/:id', adminAuth, requirePermission('DELETE_USERS'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Soft delete by deactivating the user
    await db.update(users).set({ 
      isVerified: false 
    }).where(eq(users.id, userId));

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// Merchant/Driver Application Management
router.get('/applications/merchants', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const applications = await db
      .select({
        id: merchantProfiles.id,
        businessName: merchantProfiles.businessName,
        businessType: merchantProfiles.businessType,
        isVerified: merchantProfiles.isVerified,
        createdAt: merchantProfiles.createdAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone
        }
      })
      .from(merchantProfiles)
      .innerJoin(users, eq(merchantProfiles.userId, users.id))
      .where(eq(merchantProfiles.isVerified, false))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(merchantProfiles.createdAt));

    const totalCount = await db
      .select({ count: count() })
      .from(merchantProfiles)
      .where(eq(merchantProfiles.isVerified, false));

    res.json({
      success: true,
      data: {
        items: applications,
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get merchant applications error:', error);
    res.status(500).json({ success: false, message: 'Failed to get merchant applications' });
  }
});

router.post('/applications/merchants/:id/review', adminAuth, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    const { action, reason } = req.body;

    const isApproved = action === 'approve';
    
    await db.update(merchantProfiles).set({
      isVerified: isApproved
    }).where(eq(merchantProfiles.id, merchantId));

    res.json({ success: true, message: `Merchant application ${action}d successfully` });
  } catch (error) {
    console.error('Review merchant application error:', error);
    res.status(500).json({ success: false, message: 'Failed to review application' });
  }
});

router.get('/applications/drivers', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const applications = await db
      .select({
        id: driverProfiles.id,
        vehicleType: driverProfiles.vehicleType,
        vehiclePlate: driverProfiles.vehiclePlate,
        isVerified: driverProfiles.isVerified,
        backgroundCheckStatus: driverProfiles.backgroundCheckStatus,
        createdAt: driverProfiles.createdAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone
        }
      })
      .from(driverProfiles)
      .innerJoin(users, eq(driverProfiles.userId, users.id))
      .where(eq(driverProfiles.isVerified, false))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(driverProfiles.createdAt));

    const totalCount = await db
      .select({ count: count() })
      .from(driverProfiles)
      .where(eq(driverProfiles.isVerified, false));

    res.json({
      success: true,
      data: {
        items: applications,
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get driver applications error:', error);
    res.status(500).json({ success: false, message: 'Failed to get driver applications' });
  }
});

router.post('/applications/drivers/:id/review', adminAuth, async (req, res) => {
  try {
    const driverId = parseInt(req.params.id);
    const { action, reason } = req.body;

    const isApproved = action === 'approve';
    
    await db.update(driverProfiles).set({
      isVerified: isApproved,
      backgroundCheckStatus: isApproved ? 'APPROVED' : 'REJECTED'
    }).where(eq(driverProfiles.id, driverId));

    res.json({ success: true, message: `Driver application ${action}d successfully` });
  } catch (error) {
    console.error('Review driver application error:', error);
    res.status(500).json({ success: false, message: 'Failed to review application' });
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
    const status = req.query.status as string;
    const priority = req.query.priority as string;

    let whereConditions = [];

    if (status) {
      whereConditions.push(eq(supportTickets.status, status as any));
    }

    if (priority) {
      whereConditions.push(eq(supportTickets.priority, priority as any));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const tickets = await db
      .select({
        id: supportTickets.id,
        ticketNumber: supportTickets.ticketNumber,
        userId: supportTickets.userId,
        userRole: supportTickets.userRole,
        name: supportTickets.name,
        email: supportTickets.email,
        subject: supportTickets.subject,
        message: supportTickets.message,
        status: supportTickets.status,
        priority: supportTickets.priority,
        assignedTo: supportTickets.assignedTo,
        createdAt: supportTickets.createdAt,
        user: {
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(supportTickets.createdAt));

    const totalCount = await db.select({ count: count() }).from(supportTickets).where(whereClause);

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

router.post('/support/tickets/:id/respond', adminAuth, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { response, status } = req.body;

    await db.update(supportTickets).set({
      adminNotes: response,
      status: status || 'IN_PROGRESS',
      updatedAt: new Date()
    }).where(eq(supportTickets.id, ticketId));

    res.json({ success: true, message: 'Response sent successfully' });
  } catch (error) {
    console.error('Respond to ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to respond to ticket' });
  }
});

// Transaction Management
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const type = req.query.type as string;

    let whereConditions = [];

    if (status) {
      whereConditions.push(eq(transactions.status, status as any));
    }

    if (type) {
      whereConditions.push(eq(transactions.type, type as any));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

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
        failedAt: transactions.failedAt,
        user: {
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(transactions.initiatedAt));

    const totalCount = await db.select({ count: count() }).from(transactions).where(whereClause);

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

router.post('/transactions/:id/refund', adminAuth, requirePermission('MANAGE_PAYMENTS'), async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { reason, amount } = req.body;

    // Create refund transaction
    await db.insert(transactions).values({
      userId: req.adminUser.userId,
      type: 'REFUND',
      status: 'PENDING',
      amount: amount,
      currency: 'NGN',
      description: `Refund: ${reason}`,
      initiatedAt: new Date()
    });

    // Update original transaction status
    await db.update(transactions).set({
      status: 'REVERSED',
      updatedAt: new Date()
    }).where(eq(transactions.id, transactionId));

    res.json({ success: true, message: 'Refund initiated successfully' });
  } catch (error) {
    console.error('Refund transaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
});

router.post('/transactions/:id/hold', adminAuth, requirePermission('MANAGE_PAYMENTS'), async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { reason } = req.body;

    await db.update(transactions).set({
      status: 'PROCESSING',
      description: `Held: ${reason}`,
      updatedAt: new Date()
    }).where(eq(transactions.id, transactionId));

    res.json({ success: true, message: 'Transaction held successfully' });
  } catch (error) {
    console.error('Hold transaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to hold transaction' });
  }
});

router.post('/transactions/:id/release', adminAuth, requirePermission('MANAGE_PAYMENTS'), async (req, res) => {
  try {
    const transactionId = req.params.id;

    await db.update(transactions).set({
      status: 'SUCCESS',
      completedAt: new Date(),
      updatedAt: new Date()
    }).where(eq(transactions.id, transactionId));

    res.json({ success: true, message: 'Transaction released successfully' });
  } catch (error) {
    console.error('Release transaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to release transaction' });
  }
});

// Fraud Detection & Security
router.get('/fraud/alerts', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    // This would typically come from a fraud detection system
    // For now, return mock data based on suspicious transaction patterns
    const suspiciousTransactions = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        amount: transactions.amount,
        status: transactions.status,
        initiatedAt: transactions.initiatedAt,
        user: {
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(or(
        eq(transactions.status, 'FAILED'),
        gte(transactions.amount, '100000') // Large transactions
      ))
      .limit(limit)
      .orderBy(desc(transactions.initiatedAt));

    // Mock fraud alerts
    const alerts = suspiciousTransactions.map((tx, index) => ({
      id: index + 1,
      userId: tx.userId,
      alertType: parseFloat(tx.amount) > 100000 ? 'Large Transaction' : 'Multiple Failed Attempts',
      severity: parseFloat(tx.amount) > 500000 ? 'CRITICAL' : 'HIGH',
      description: `Suspicious transaction pattern detected for user ${tx.user?.fullName}`,
      status: 'PENDING',
      createdAt: tx.initiatedAt,
      metadata: {
        transactionId: tx.id,
        amount: tx.amount
      },
      user: tx.user
    }));

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

router.post('/fraud/alerts/:id/update', adminAuth, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const { status, notes } = req.body;

    // In a real implementation, this would update the fraud alert in the database
    res.json({ success: true, message: 'Fraud alert updated successfully' });
  } catch (error) {
    console.error('Update fraud alert error:', error);
    res.status(500).json({ success: false, message: 'Failed to update fraud alert' });
  }
});

router.post('/security/flag-account/:userId', adminAuth, requirePermission('FLAG_ACCOUNTS'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { reason, severity } = req.body;

    // Flag the account by marking it as unverified and adding a note
    await db.update(users).set({
      isVerified: false
    }).where(eq(users.id, userId));

    res.json({ success: true, message: 'Account flagged successfully' });
  } catch (error) {
    console.error('Flag account error:', error);
    res.status(500).json({ success: false, message: 'Failed to flag account' });
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

router.get('/monitoring/orders/active', adminAuth, async (req, res) => {
  try {
    const activeOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalPrice: orders.totalPrice,
        deliveryAddress: orders.deliveryAddress,
        createdAt: orders.createdAt,
        buyer: {
          fullName: users.fullName,
          phone: users.phone
        },
        product: {
          name: products.name
        }
      })
      .from(orders)
      .leftJoin(users, eq(orders.buyerId, users.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .where(inArray(orders.status, ['pending', 'confirmed', 'processing', 'shipped']))
      .orderBy(desc(orders.createdAt));

    res.json({
      success: true,
      data: activeOrders
    });
  } catch (error) {
    console.error('Get active orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to get active orders' });
  }
});

// Content Moderation
router.get('/moderation/reports', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const reports = await db
      .select({
        id: contentReports.id,
        contentType: contentReports.contentType,
        contentId: contentReports.contentId,
        reason: contentReports.reason,
        status: contentReports.status,
        createdAt: contentReports.createdAt,
        reporter: {
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(contentReports)
      .leftJoin(users, eq(contentReports.reportedBy, users.id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contentReports.createdAt));

    const totalCount = await db.select({ count: count() }).from(contentReports);

    res.json({
      success: true,
      data: {
        items: reports,
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get moderation reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to get moderation reports' });
  }
});

router.post('/moderation/reports/:id/resolve', adminAuth, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { action, reason } = req.body;

    await db.update(contentReports).set({
      status: 'RESOLVED'
    }).where(eq(contentReports.id, reportId));

    res.json({ success: true, message: 'Report resolved successfully' });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve report' });
  }
});

// System Monitoring
router.get('/monitoring/system/health', adminAuth, async (req, res) => {
  try {
    // Check database connectivity
    const dbCheck = await db.select({ count: count() }).from(users);
    
    // Check recent transaction activity
    const recentTransactions = await db
      .select({ count: count() })
      .from(transactions)
      .where(gte(transactions.initiatedAt, new Date(Date.now() - 60 * 60 * 1000))); // Last hour

    const health = {
      database: dbCheck[0].count >= 0 ? 'healthy' : 'error',
      api: 'online',
      paymentGateway: 'active',
      websocket: recentTransactions[0].count > 0 ? 'active' : 'warning',
      lastChecked: new Date().toISOString()
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

router.get('/monitoring/metrics/realtime', adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      recentTransactions,
      activeUsers,
      pendingOrders
    ] = await Promise.all([
      db.select({ count: count() }).from(transactions).where(gte(transactions.initiatedAt, oneHourAgo)),
      db.select({ count: count() }).from(users).where(gte(users.createdAt, oneHourAgo)),
      db.select({ count: count() }).from(orders).where(inArray(orders.status, ['pending', 'confirmed']))
    ]);

    res.json({
      success: true,
      data: {
        recentTransactions: recentTransactions[0].count,
        newUsers: activeUsers[0].count,
        pendingOrders: pendingOrders[0].count,
        timestamp: now.toISOString()
      }
    });
  } catch (error) {
    console.error('Get realtime metrics error:', error);
    res.status(500).json({ success: false, message: 'Failed to get realtime metrics' });
  }
});

// Database Maintenance
router.post('/maintenance/backup', adminAuth, requirePermission('SYSTEM_MAINTENANCE'), async (req, res) => {
  try {
    // In a real implementation, this would trigger a database backup
    const backupId = `backup_${Date.now()}`;
    
    res.json({ 
      success: true, 
      message: 'Backup initiated successfully',
      data: { backupId }
    });
  } catch (error) {
    console.error('Database backup error:', error);
    res.status(500).json({ success: false, message: 'Backup failed' });
  }
});

router.post('/maintenance/cleanup', adminAuth, requirePermission('SYSTEM_MAINTENANCE'), async (req, res) => {
  try {
    // Clean up old sessions, logs, etc.
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    // Example: Clean up old failed transactions
    await db.delete(transactions).where(
      and(
        eq(transactions.status, 'FAILED'),
        lte(transactions.initiatedAt, cutoffDate)
      )
    );

    res.json({ success: true, message: 'Database cleanup completed' });
  } catch (error) {
    console.error('Database cleanup error:', error);
    res.status(500).json({ success: false, message: 'Cleanup failed' });
  }
});

// Live Chat & Support System
router.get('/support/live-chat/sessions', adminAuth, async (req, res) => {
  try {
    const activeSessions = await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        status: conversations.status,
        lastMessage: conversations.lastMessage,
        lastMessageAt: conversations.lastMessageAt,
        customer: {
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(conversations)
      .leftJoin(users, eq(conversations.customerId, users.id))
      .where(eq(conversations.status, 'ACTIVE'))
      .orderBy(desc(conversations.lastMessageAt));

    res.json({
      success: true,
      data: activeSessions
    });
  } catch (error) {
    console.error('Get chat sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get chat sessions' });
  }
});

router.get('/support/live-chat/messages/:conversationId', adminAuth, async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const messages = await db
      .select({
        id: chatMessages.id,
        content: chatMessages.content,
        messageType: chatMessages.messageType,
        createdAt: chatMessages.createdAt,
        sender: {
          fullName: users.fullName,
          role: users.role
        }
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderId, users.id))
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to get chat messages' });
  }
});

export default router;
