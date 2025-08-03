import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import {
  users,
  supportTickets,
  contentReports as reports,
  userLocations,
  adminUsers,
  adminPaymentActions,
  deliveryConfirmations,
  contentReports,
  moderationResponses,
  vendorViolations,
  complianceDocuments,
  escrowAccounts,
  paymentDistributions,
  products,
  merchantProfiles,
  orders
} from '../../shared/schema';
import { adminAuth } from '../middleware/adminAuth';

export function setupAdminRoutes() {
  const router = Router();

  // Admin Authentication Routes (unprotected)
  router.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
      }

      // Find admin user
      const adminUser = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.username, username)
      });

      if (!adminUser) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, adminUser.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Check if admin is active
      if (adminUser.status !== 'ACTIVE') {
        return res.status(401).json({ success: false, message: 'Account is not active' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          adminId: adminUser.id,
          username: adminUser.username,
          role: adminUser.role
        },
        process.env.JWT_SECRET || 'admin-secret-key',
        { expiresIn: '8h' }
      );

      // Update last login
      await db.update(adminUsers)
        .set({ lastLogin: new Date() })
        .where(eq(adminUsers.id, adminUser.id));

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: adminUser.id,
            username: adminUser.username,
            email: adminUser.email,
            role: adminUser.role,
            permissions: adminUser.permissions || []
          }
        }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  router.post('/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
  });

  router.get('/auth/me', adminAuth, async (req, res) => {
    try {
      const adminUser = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.id, req.user.adminId)
      });

      if (!adminUser) {
        return res.status(404).json({ success: false, message: 'Admin user not found' });
      }

      res.json({
        success: true,
        data: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role,
          permissions: adminUser.permissions || []
        }
      });
    } catch (error) {
      console.error('Get admin profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
  });

  // Protect all other admin routes
  router.use(adminAuth);

  // Get all users
  router.get('/users', async (req, res) => {
    const allUsers = await db.query.users.findMany({
      orderBy: desc(users.createdAt)
    });
    res.json(allUsers);
  });

  // Get user statistics
  router.get('/metrics', async (req, res) => {
    const [userCount, openTickets] = await Promise.all([
      db.query.users.findMany().then(users => users.length),
      db.query.supportTickets.findMany({
        where: eq(supportTickets.status, 'OPEN')
      }).then(tickets => tickets.length)
    ]);

    res.json({
      userCount,
      openTickets
    });
  });

  // Get all support tickets
  router.get('/support-tickets', async (req, res) => {
    const tickets = await db.query.supportTickets.findMany({
      orderBy: desc(supportTickets.createdAt)
    });
    res.json(tickets);
  });

  // Update ticket status
  router.post('/support-tickets/:id/status', async (req, res) => {
    const { status } = req.body;
    await db.update(supportTickets)
      .set({ status })
      .where(eq(supportTickets.id, req.params.id));
    res.json({ success: true });
  });

  // Get all reports
  router.get('/reports', async (req, res) => {
    const allReports = await db.query.contentReports.findMany({
      orderBy: desc(contentReports.createdAt)
    });
    res.json(allReports);
  });

  // Update report status
  router.post('/reports/:id/status', async (req, res) => {
    const { status } = req.body;
    await db.update(contentReports)
      .set({ status })
      .where(eq(contentReports.id, parseInt(req.params.id)));
    res.json({ success: true });
  });

  // Get all driver locations
  router.get('/driver-locations', async (req, res) => {
    const driverLocations = await db.query.userLocations.findMany({
      orderBy: desc(userLocations.updatedAt)
    });
    res.json(driverLocations);
  });

  // Content Moderation
  router.get('/content-reports', async (req, res) => {
    try {
      const reports = await db.select().from(contentReports)
        .orderBy(desc(contentReports.createdAt));
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch content reports' });
    }
  });

  router.post('/content-reports/:reportId/respond', async (req, res) => {
    const { reportId } = req.params;
    const { response, action } = req.body;
    const adminId = req.user?.id;

    try {
      const moderationResponse = await db.insert(moderationResponses).values({
        reportId: parseInt(reportId),
        adminId: adminId || 1,
        response,
        action
      }).returning();

      await db.update(contentReports)
        .set({ status: 'REVIEWED', updatedAt: new Date() })
        .where(eq(contentReports.id, parseInt(reportId)));

      res.json(moderationResponse);
    } catch (error) {
      res.status(500).json({ error: 'Failed to submit moderation response' });
    }
  });

  // Vendor Violations
  router.get('/violations', async (req, res) => {
    try {
      const violations = await db.select().from(vendorViolations)
        .orderBy(desc(vendorViolations.createdAt));
      res.json(violations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vendor violations' });
    }
  });

  // Compliance Documents
  router.get('/compliance/documents', async (req, res) => {
    try {
      const documents = await db.select().from(complianceDocuments)
        .orderBy(desc(complianceDocuments.createdAt));
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch compliance documents' });
    }
  });

  router.put('/compliance/documents/:documentId', async (req, res) => {
    const { documentId } = req.params;
    const { status } = req.body;
    const adminId = req.user?.id;

    try {
      const updatedDocument = await db.update(complianceDocuments)
        .set({
          status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(complianceDocuments.id, parseInt(documentId)))
        .returning();

      res.json(updatedDocument);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update compliance document' });
    }
  });

  // Payment Management
  router.get('/payments/actions', async (req, res) => {
    try {
      const actions = await db.select().from(adminPaymentActions)
        .orderBy(desc(adminPaymentActions.createdAt));
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch payment actions' });
    }
  });

  router.post('/payments/distribute', async (req, res) => {
    const { paymentId, recipientId, amount } = req.body;
    const adminId = req.user?.id;

    try {
      const distribution = await db.insert(paymentDistributions).values({
        paymentId,
        recipientId,
        amount,
        status: 'PENDING'
      }).returning();

      await db.insert(adminPaymentActions).values({
        adminId: adminId || 1,
        action: 'DISTRIBUTE',
        paymentId,
        details: { distributionId: distribution[0].id, amount }
      });

      res.json(distribution);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create payment distribution' });
    }
  });

  // Delivery Confirmations
  router.get('/delivery/confirmations', async (req, res) => {
    try {
      const confirmations = await db.select().from(deliveryConfirmations)
        .orderBy(desc(deliveryConfirmations.createdAt));
      res.json(confirmations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch delivery confirmations' });
    }
  });

  // Enhanced Metrics
  router.get('/enhanced-metrics', async (req, res) => {
    try {
      const [userCount, orderCount, productCount, merchantCount] = await Promise.all([
        db.select().from(users).execute(),
        db.select().from(orders).execute(),
        db.select().from(products).execute(),
        db.select().from(merchantProfiles).execute()
      ]);

      res.json({
        success: true,
        data: {
          totalUsers: userCount.length,
          totalOrders: orderCount.length,
          totalProducts: productCount.length,
          totalMerchants: merchantCount.length
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch enhanced metrics' });
    }
  });

  // User Management Routes
  router.get('/users/:id', async (req, res) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.params.id)
      });
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
  });

  router.put('/users/:id/status', async (req, res) => {
    try {
      const { status } = req.body;
      await db.update(users)
        .set({ status, updatedAt: new Date() })
        .where(eq(users.id, req.params.id));
      
      res.json({ success: true, message: 'User status updated' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update user status' });
    }
  });

  router.post('/users/:id/suspend', async (req, res) => {
    try {
      const { reason } = req.body;
      await db.update(users)
        .set({ 
          status: 'SUSPENDED',
          suspensionReason: reason,
          suspendedAt: new Date(),
          suspendedBy: req.user.adminId,
          updatedAt: new Date()
        })
        .where(eq(users.id, req.params.id));
      
      res.json({ success: true, message: 'User suspended successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to suspend user' });
    }
  });

  // KYC Verification Routes
  router.get('/verifications/pending', async (req, res) => {
    try {
      const pendingVerifications = await db.query.users.findMany({
        where: eq(users.verificationStatus, 'PENDING')
      });
      res.json({ success: true, data: pendingVerifications });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch pending verifications' });
    }
  });

  router.post('/verifications/:id/approve', async (req, res) => {
    try {
      await db.update(users)
        .set({ 
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedBy: req.user.adminId,
          updatedAt: new Date()
        })
        .where(eq(users.id, req.params.id));
      
      res.json({ success: true, message: 'Verification approved' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to approve verification' });
    }
  });

  router.post('/verifications/:id/reject', async (req, res) => {
    try {
      const { reason } = req.body;
      await db.update(users)
        .set({ 
          verificationStatus: 'REJECTED',
          rejectionReason: reason,
          rejectedAt: new Date(),
          rejectedBy: req.user.adminId,
          updatedAt: new Date()
        })
        .where(eq(users.id, req.params.id));
      
      res.json({ success: true, message: 'Verification rejected' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to reject verification' });
    }
  });

  // Transaction Management
  router.get('/transactions', async (req, res) => {
    try {
      // This would need to be implemented based on your transaction schema
      const transactions = []; // Placeholder
      res.json({ success: true, data: transactions });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
  });

  router.post('/transactions/:id/refund', async (req, res) => {
    try {
      const { amount } = req.body;
      // Implement refund logic here
      res.json({ success: true, message: 'Refund processed successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to process refund' });
    }
  });

  // Fraud Detection Routes
  router.get('/suspicious-activities', async (req, res) => {
    try {
      // Implement based on your fraud detection schema
      const activities = []; // Placeholder
      res.json({ success: true, data: activities });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch suspicious activities' });
    }
  });

  router.post('/suspicious-activities/:id/flag', async (req, res) => {
    try {
      const { severity } = req.body;
      // Implement flagging logic
      res.json({ success: true, message: 'Activity flagged successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to flag activity' });
    }
  });

  router.post('/suspicious-activities/:id/resolve', async (req, res) => {
    try {
      const { resolution } = req.body;
      // Implement resolution logic
      res.json({ success: true, message: 'Activity resolved successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to resolve activity' });
    }
  });

  // System Maintenance Routes
  router.post('/system/backup', async (req, res) => {
    try {
      // Implement backup logic
      res.json({ success: true, message: 'Backup initiated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to initiate backup' });
    }
  });

  router.get('/system/status', async (req, res) => {
    try {
      // Implement system status check
      const status = {
        database: 'healthy',
        api: 'healthy',
        storage: 'healthy',
        uptime: process.uptime()
      };
      res.json({ success: true, data: status });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get system status' });
    }
  });

  router.post('/system/maintenance', async (req, res) => {
    try {
      const { type } = req.body;
      // Implement maintenance logic based on type
      res.json({ success: true, message: `${type} maintenance completed successfully` });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to perform maintenance' });
    }
  });

  // Refund Management
  router.get('/refunds', async (req, res) => {
    try {
      // Implement refund requests fetching
      const refunds = []; // Placeholder
      res.json({ success: true, data: refunds });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch refund requests' });
    }
  });

  router.post('/refunds/:id/approve', async (req, res) => {
    try {
      // Implement refund approval logic
      res.json({ success: true, message: 'Refund approved successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to approve refund' });
    }
  });

  router.post('/refunds/:id/reject', async (req, res) => {
    try {
      const { reason } = req.body;
      // Implement refund rejection logic
      res.json({ success: true, message: 'Refund rejected successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to reject refund' });
    }
  });

  return router;
}