import { Router } from 'express';
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

  // Protect all admin routes
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
        totalUsers: userCount.length,
        totalOrders: orderCount.length,
        totalProducts: productCount.length,
        totalMerchants: merchantCount.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch enhanced metrics' });
    }
  });

  return router;
}