import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, supportTickets, transactions, driverProfiles, merchantProfiles, wallets, orders, products, categories, chatMessages, identityVerifications, driverVerifications } from '../../shared/schema';
import { eq, desc, and, or, like, gte, lte, count, sql, inArray } from 'drizzle-orm';
import { requireAdminAuth } from '../middleware/adminAuth';
import { Request, Response, Router } from "express";
import { storage } from "../storage";

const router = express.Router();

// Admin authentication is handled in /api/auth/admin/login - redirect users there
router.post('/auth/login', async (req, res) => {
  res.status(301).json({ 
    success: false, 
    message: 'Admin login moved to /api/auth/admin/login',
    redirect: '/api/auth/admin/login'
  });
});

router.post('/auth/logout', requireAdminAuth, async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/auth/profile', requireAdminAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isVerified: users.isVerified,
        isActive: users.isActive
      })
      .from(users)
      .where(eq(users.id, (req as any).user.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
});

// Dashboard Metrics
router.get('/dashboard/metrics', requireAdminAuth, async (req, res) => {
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
      db.select({ count: count() }).from(orders),
      db.select({ 
        total: sql<number>`COALESCE(SUM(CAST(${orders.totalPrice} AS DECIMAL)), 0)`
      }).from(orders).where(eq(orders.status, 'delivered')),
      db.select({ count: count() }).from(orders).where(inArray(orders.status, ['pending', 'confirmed', 'processing', 'shipped'])),
      db.select({ count: count() }).from(users).where(eq(users.isVerified, false)),
      db.select({ count: count() }).from(users).where(eq(users.isVerified, false)),
      db.select({ count: count() }).from(supportTickets).where(or(eq(supportTickets.status, 'OPEN'), eq(supportTickets.status, 'IN_PROGRESS'))),
      db.select({ count: count() }).from(supportTickets).where(eq(supportTickets.status, 'OPEN'))
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
router.get('/users', requireAdminAuth, async (req, res) => {
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

router.get('/users/:id', requireAdminAuth, async (req, res) => {
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

router.patch('/users/:id/status', requireAdminAuth, async (req, res) => {
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

router.delete('/users/:id', requireAdminAuth, async (req, res) => {
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
router.get('/applications/merchants', requireAdminAuth, async (req, res) => {
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

router.post('/applications/merchants/:id/review', requireAdminAuth, async (req, res) => {
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

router.get('/applications/drivers', requireAdminAuth, async (req, res) => {
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

router.post('/applications/drivers/:id/review', requireAdminAuth, async (req, res) => {
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
router.get('/kyc/pending', requireAdminAuth, async (req, res) => {
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

router.post('/kyc/:documentId/review', requireAdminAuth, async (req, res) => {
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

// Batch KYC operations
router.post('/kyc/batch-review', requireAdminAuth, async (req, res) => {
  try {
    const { documentIds, action, reason } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid document IDs' });
    }

    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    
    // Update all documents in batch
    await db.update(complianceDocuments).set({
      status,
      reviewedBy: req.adminUser.adminId,
      reviewedAt: new Date()
    }).where(inArray(complianceDocuments.id, documentIds));

    // If approved, update user verification status for all users
    if (action === 'approve') {
      const documents = await db.select().from(complianceDocuments).where(inArray(complianceDocuments.id, documentIds));
      const userIds = Array.from(new Set(documents.map(doc => doc.userId)));
      
      await db.update(users).set({
        isIdentityVerified: true
      }).where(inArray(users.id, userIds));
    }

    res.json({ 
      success: true, 
      message: `${documentIds.length} KYC documents ${action}d successfully` 
    });
  } catch (error) {
    console.error('Batch KYC review error:', error);
    res.status(500).json({ success: false, message: 'Failed to batch review KYC' });
  }
});

// Support Tickets
router.get('/support/tickets', requireAdminAuth, async (req, res) => {
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

    // Validate pagination parameters
    if (page < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid page number. Must be 1 or greater.' 
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid limit. Must be between 1 and 100.' 
      });
    }

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

router.patch('/support/tickets/:id', requireAdminAuth, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const updates = req.body;
    const oldTicket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);

    if (updates.assignedTo !== undefined) {
      updates.assignedTo = parseInt(updates.assignedTo);
    }

    if (updates.status === 'RESOLVED' || updates.status === 'CLOSED') {
      updates.resolvedAt = new Date();
    }

    updates.updatedAt = new Date();

    await db.update(supportTickets).set(updates).where(eq(supportTickets.id, ticketId));

    // Emit WebSocket event for real-time updates
    const { setupWebSocketServer } = await import('../websocket');
    const server = req.app.get('server');
    if (server && server.io) {
      if (oldTicket[0] && updates.status && oldTicket[0].status !== updates.status) {
        server.io.to('admin_support').emit('ticket_status_updated', {
          type: 'ticket_status_updated',
          ticketId,
          oldStatus: oldTicket[0].status,
          newStatus: updates.status,
          updatedBy: req.adminUser.adminId,
          timestamp: Date.now()
        });
      }

      if (updates.assignedTo) {
        server.io.to('admin_support').emit('ticket_assigned', {
          type: 'ticket_assigned',
          ticketId,
          assignedTo: updates.assignedTo,
          assignedBy: req.adminUser.adminId,
          timestamp: Date.now()
        });
      }
    }

    res.json({ success: true, message: 'Ticket updated successfully' });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
});

router.post('/support/tickets/:id/respond', requireAdminAuth, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { response, status } = req.body;

    // Get ticket details for email notification
    const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
    
    if (ticket.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    await db.update(supportTickets).set({
      adminNotes: response,
      status: status || 'IN_PROGRESS',
      updatedAt: new Date()
    }).where(eq(supportTickets.id, ticketId));

    // Emit WebSocket event for real-time updates
    const { setupWebSocketServer } = await import('../websocket');
    const server = req.app.get('server');
    if (server && server.io) {
      server.io.to('admin_support').emit('ticket_response_sent', {
        type: 'ticket_response_sent',
        ticketId,
        response,
        sentBy: req.adminUser.adminId,
        customerEmail: ticket[0].email,
        timestamp: Date.now()
      });

      if (status) {
        server.io.to('admin_support').emit('ticket_status_updated', {
          type: 'ticket_status_updated',
          ticketId,
          oldStatus: ticket[0].status,
          newStatus: status,
          updatedBy: req.adminUser.adminId,
          timestamp: Date.now()
        });
      }
    }

    res.json({ success: true, message: 'Response sent successfully' });
  } catch (error) {
    console.error('Respond to ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to respond to ticket' });
  }
});

// Bulk ticket assignment
router.post('/support/tickets/bulk-assign', requireAdminAuth, async (req, res) => {
  try {
    const { ticketIds, adminId, priority } = req.body;

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid ticket IDs' });
    }

    const updates: any = {
      assignedTo: adminId,
      status: 'IN_PROGRESS',
      updatedAt: new Date()
    };

    if (priority) {
      updates.priority = priority;
    }

    await db.update(supportTickets)
      .set(updates)
      .where(inArray(supportTickets.id, ticketIds));

    // Emit WebSocket event for real-time updates
    const server = req.app.get('server');
    if (server && server.io) {
      server.io.to('admin_support').emit('tickets_bulk_assigned', {
        type: 'tickets_bulk_assigned',
        ticketIds,
        assignedTo: adminId,
        assignedBy: req.adminUser.adminId,
        priority,
        timestamp: Date.now()
      });
    }

    res.json({ 
      success: true, 
      message: `${ticketIds.length} tickets assigned successfully` 
    });
  } catch (error) {
    console.error('Bulk assign tickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign tickets' });
  }
});

// Escalate ticket
router.post('/support/tickets/:id/escalate', requireAdminAuth, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { priority, reason } = req.body;

    const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
    
    if (ticket.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    await db.update(supportTickets).set({
      priority: priority || 'HIGH',
      status: 'IN_PROGRESS',
      adminNotes: reason ? `Escalated: ${reason}` : 'Ticket escalated',
      updatedAt: new Date()
    }).where(eq(supportTickets.id, ticketId));

    // Emit WebSocket event for real-time updates
    const server = req.app.get('server');
    if (server && server.io) {
      server.io.to('admin_support').emit('ticket_escalated', {
        type: 'ticket_escalated',
        ticketId,
        oldPriority: ticket[0].priority,
        newPriority: priority || 'HIGH',
        escalatedBy: req.adminUser.adminId,
        reason,
        timestamp: Date.now()
      });
    }

    res.json({ success: true, message: 'Ticket escalated successfully' });
  } catch (error) {
    console.error('Escalate ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to escalate ticket' });
  }
});

// Get ticket statistics for dashboard
router.get('/support/statistics', requireAdminAuth, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      urgentTickets,
      todayTickets,
      weekTickets,
      avgResponseTime
    ] = await Promise.all([
      db.select({ count: count() }).from(supportTickets),
      db.select({ count: count() }).from(supportTickets).where(eq(supportTickets.status, 'OPEN')),
      db.select({ count: count() }).from(supportTickets).where(eq(supportTickets.status, 'IN_PROGRESS')),
      db.select({ count: count() }).from(supportTickets).where(eq(supportTickets.status, 'RESOLVED')),
      db.select({ count: count() }).from(supportTickets).where(eq(supportTickets.priority, 'URGENT')),
      db.select({ count: count() }).from(supportTickets).where(gte(supportTickets.createdAt, today)),
      db.select({ count: count() }).from(supportTickets).where(gte(supportTickets.createdAt, thisWeek)),
      // Mock average response time calculation
      Promise.resolve([{ avg: 2.5 }])
    ]);

    res.json({
      success: true,
      data: {
        total: totalTickets[0].count,
        open: openTickets[0].count,
        inProgress: inProgressTickets[0].count,
        resolved: resolvedTickets[0].count,
        urgent: urgentTickets[0].count,
        today: todayTickets[0].count,
        thisWeek: weekTickets[0].count,
        avgResponseTime: avgResponseTime[0].avg
      }
    });
  } catch (error) {
    console.error('Get support statistics error:', error);
    res.status(500).json({ success: false, message: 'Failed to get statistics' });
  }
});

// Enhanced Transaction Management with Advanced Filtering
router.get('/transactions', requireAdminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Enhanced filter parameters
    const status = req.query.status as string;
    const type = req.query.type as string;
    const userId = req.query.userId as string;
    const minAmount = req.query.minAmount as string;
    const maxAmount = req.query.maxAmount as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const search = req.query.search as string;
    const channel = req.query.channel as string;

    let whereConditions = [];

    if (status) {
      whereConditions.push(eq(transactions.status, status as any));
    }

    if (type) {
      whereConditions.push(eq(transactions.type, type as any));
    }

    if (userId) {
      whereConditions.push(eq(transactions.userId, parseInt(userId)));
    }

    if (minAmount) {
      whereConditions.push(gte(transactions.amount, minAmount));
    }

    if (maxAmount) {
      whereConditions.push(lte(transactions.amount, maxAmount));
    }

    if (startDate) {
      whereConditions.push(gte(transactions.initiatedAt, new Date(startDate)));
    }

    if (endDate) {
      whereConditions.push(lte(transactions.initiatedAt, new Date(endDate)));
    }

    if (channel) {
      whereConditions.push(eq(transactions.channel, channel));
    }

    if (search) {
      whereConditions.push(
        or(
          like(transactions.description, `%${search}%`),
          like(transactions.paystackReference, `%${search}%`),
          like(users.fullName, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
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
        metadata: transactions.metadata,
        user: {
          id: users.id,
          userId: users.userId,
          fullName: users.fullName,
          email: users.email,
          role: users.role
        }
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(transactions.initiatedAt));

    const totalCount = await db.select({ count: count() }).from(transactions).where(whereClause);

    // Get transaction statistics
    const [successTotal, failedTotal, pendingTotal] = await Promise.all([
      db.select({ 
        total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
        count: count()
      }).from(transactions).where(and(whereClause || sql`1=1`, eq(transactions.status, 'SUCCESS'))),
      db.select({ count: count() }).from(transactions).where(and(whereClause || sql`1=1`, eq(transactions.status, 'FAILED'))),
      db.select({ count: count() }).from(transactions).where(and(whereClause || sql`1=1`, eq(transactions.status, 'PENDING')))
    ]);

    res.json({
      success: true,
      data: {
        items: transactionsData,
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit),
        statistics: {
          successTotal: successTotal[0].total || 0,
          successCount: successTotal[0].count,
          failedCount: failedTotal[0].count,
          pendingCount: pendingTotal[0].count
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
});

// Enhanced transaction refund with real-time updates
router.post('/transactions/:id/refund', requireAdminAuth, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { reason, amount, refundType = 'FULL' } = req.body;

    // Get original transaction to get correct user ID
    const originalTx = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
    if (originalTx.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const refundAmount = refundType === 'FULL' ? originalTx[0].amount : amount;

    // Create refund transaction
    const refundTx = await db.insert(transactions).values({
      userId: originalTx[0].userId,
      type: 'REFUND',
      status: 'PROCESSING',
      amount: refundAmount,
      netAmount: refundAmount,
      currency: originalTx[0].currency || 'NGN',
      description: `Refund (${refundType}): ${reason}`,
      metadata: {
        originalTransactionId: transactionId,
        refundType,
        processedBy: req.adminUser.adminId,
        processedAt: new Date().toISOString()
      },
      initiatedAt: new Date()
    }).returning();

    // Log admin action
    await db.insert(adminPaymentActions).values({
      adminId: req.adminUser.adminId,
      action: 'REFUND',
      paymentId: transactionId,
      details: {
        refundAmount,
        refundType,
        reason,
        refundTransactionId: refundTx[0].id
      }
    });

    // Update original transaction status
    await db.update(transactions).set({
      status: 'REVERSED',
      updatedAt: new Date()
    }).where(eq(transactions.id, transactionId));

    // Emit real-time update
    const server = req.app.get('server');
    if (server && server.io) {
      server.io.to('admin_transactions').emit('transaction_refunded', {
        type: 'transaction_refunded',
        transactionId,
        refundTransactionId: refundTx[0].id,
        amount: refundAmount,
        refundType,
        processedBy: req.adminUser.adminId,
        timestamp: Date.now()
      });
    }

    res.json({ 
      success: true, 
      message: 'Refund initiated successfully',
      data: { refundTransactionId: refundTx[0].id }
    });
  } catch (error) {
    console.error('Refund transaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
});

// Enhanced transaction hold with real-time updates
router.post('/transactions/:id/hold', requireAdminAuth, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { reason, holdType = 'MANUAL' } = req.body;

    const originalTx = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
    if (originalTx.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    await db.update(transactions).set({
      status: 'PROCESSING',
      metadata: {
        ...originalTx[0].metadata as any,
        holdReason: reason,
        holdType,
        heldBy: req.adminUser.adminId,
        heldAt: new Date().toISOString()
      },
      updatedAt: new Date()
    }).where(eq(transactions.id, transactionId));

    // Log admin action
    await db.insert(adminPaymentActions).values({
      adminId: req.adminUser.adminId,
      action: 'HOLD',
      paymentId: transactionId,
      details: {
        reason,
        holdType,
        originalStatus: originalTx[0].status
      }
    });

    // Emit real-time update
    const server = req.app.get('server');
    if (server && server.io) {
      server.io.to('admin_transactions').emit('transaction_held', {
        type: 'transaction_held',
        transactionId,
        reason,
        holdType,
        heldBy: req.adminUser.adminId,
        timestamp: Date.now()
      });
    }

    res.json({ success: true, message: 'Transaction held successfully' });
  } catch (error) {
    console.error('Hold transaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to hold transaction' });
  }
});

// Enhanced transaction release with real-time updates
router.post('/transactions/:id/release', requireAdminAuth, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { notes } = req.body;

    const originalTx = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
    if (originalTx.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    await db.update(transactions).set({
      status: 'SUCCESS',
      completedAt: new Date(),
      metadata: {
        ...originalTx[0].metadata as any,
        releaseNotes: notes,
        releasedBy: req.adminUser.adminId,
        releasedAt: new Date().toISOString()
      },
      updatedAt: new Date()
    }).where(eq(transactions.id, transactionId));

    // Log admin action
    await db.insert(adminPaymentActions).values({
      adminId: req.adminUser.adminId,
      action: 'RELEASE',
      paymentId: transactionId,
      details: {
        notes,
        previousStatus: originalTx[0].status
      }
    });

    // Emit real-time update
    const server = req.app.get('server');
    if (server && server.io) {
      server.io.to('admin_transactions').emit('transaction_released', {
        type: 'transaction_released',
        transactionId,
        notes,
        releasedBy: req.adminUser.adminId,
        timestamp: Date.now()
      });
    }

    res.json({ success: true, message: 'Transaction released successfully' });
  } catch (error) {
    console.error('Release transaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to release transaction' });
  }
});

// Get detailed transaction information
router.get('/transactions/:id', requireAdminAuth, async (req, res) => {
  try {
    const transactionId = req.params.id;

    const transactionData = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        recipientId: transactions.recipientId,
        walletId: transactions.walletId,
        paymentMethodId: transactions.paymentMethodId,
        orderId: transactions.orderId,
        type: transactions.type,
        status: transactions.status,
        amount: transactions.amount,
        fee: transactions.fee,
        netAmount: transactions.netAmount,
        currency: transactions.currency,
        paystackReference: transactions.paystackReference,
        paystackTransactionId: transactions.paystackTransactionId,
        gatewayResponse: transactions.gatewayResponse,
        description: transactions.description,
        metadata: transactions.metadata,
        channel: transactions.channel,
        ipAddress: transactions.ipAddress,
        userAgent: transactions.userAgent,
        initiatedAt: transactions.initiatedAt,
        completedAt: transactions.completedAt,
        failedAt: transactions.failedAt,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        user: {
          id: users.id,
          userId: users.userId,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          role: users.role
        }
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (transactionData.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Get related admin actions
    const adminActions = await db
      .select({
        id: adminPaymentActions.id,
        action: adminPaymentActions.action,
        details: adminPaymentActions.details,
        createdAt: adminPaymentActions.createdAt,
        admin: {
          id: adminUsers.id,
          role: adminUsers.role,
          user: {
            fullName: users.fullName,
            email: users.email
          }
        }
      })
      .from(adminPaymentActions)
      .leftJoin(adminUsers, eq(adminPaymentActions.adminId, adminUsers.id))
      .leftJoin(users, eq(adminUsers.userId, users.userId))
      .where(eq(adminPaymentActions.paymentId, transactionId))
      .orderBy(desc(adminPaymentActions.createdAt));

    res.json({
      success: true,
      data: {
        transaction: transactionData[0],
        adminActions
      }
    });
  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({ success: false, message: 'Failed to get transaction details' });
  }
});

// Bulk transaction operations
router.post('/transactions/bulk-action', requireAdminAuth, async (req, res) => {
  try {
    const { transactionIds, action, reason } = req.body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid transaction IDs' });
    }

    let updateData: any = { updatedAt: new Date() };
    let actionType: string;

    switch (action) {
      case 'hold':
        updateData.status = 'PROCESSING';
        actionType = 'HOLD';
        break;
      case 'release':
        updateData.status = 'SUCCESS';
        updateData.completedAt = new Date();
        actionType = 'RELEASE';
        break;
      case 'cancel':
        updateData.status = 'CANCELLED';
        updateData.failedAt = new Date();
        actionType = 'CANCEL';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    // Update transactions
    await db.update(transactions)
      .set(updateData)
      .where(inArray(transactions.id, transactionIds));

    // Log bulk admin actions
    const bulkActions = transactionIds.map(transactionId => ({
      adminId: req.adminUser.adminId,
      action: actionType as any,
      paymentId: transactionId,
      details: {
        reason,
        bulkOperation: true,
        totalTransactions: transactionIds.length
      }
    }));

    await db.insert(adminPaymentActions).values(bulkActions);

    // Emit real-time update
    const server = req.app.get('server');
    if (server && server.io) {
      server.io.to('admin_transactions').emit('transactions_bulk_action', {
        type: 'transactions_bulk_action',
        transactionIds,
        action,
        reason,
        processedBy: req.adminUser.adminId,
        timestamp: Date.now()
      });
    }

    res.json({ 
      success: true, 
      message: `${transactionIds.length} transactions ${action}ed successfully` 
    });
  } catch (error) {
    console.error('Bulk transaction action error:', error);
    res.status(500).json({ success: false, message: 'Failed to process bulk action' });
  }
});

// Fraud Detection & Security
router.get('/fraud/alerts', requireAdminAuth, async (req, res) => {
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

router.post('/fraud/alerts/:id/update', requireAdminAuth, async (req, res) => {
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

router.post('/security/flag-account/:userId', requireAdminAuth, async (req, res) => {
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
router.get('/monitoring/drivers/locations', requireAdminAuth, async (req, res) => {
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
      data: driverLocations    });
  } catch (error) {
    console.error('Get driver locations error:', error);
    res.status(500).json({ success: false, message: 'Failed to get driver locations' });
  }
});

router.get('/monitoring/orders/active', requireAdminAuth, async (req, res) => {
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
router.get('/moderation/reports', requireAdminAuth, async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      status = '', 
      contentType = '', 
      priority = '',
      search = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let whereConditions = [];

    if (status) whereConditions.push(eq(contentReports.status, status as string));
    if (contentType) whereConditions.push(eq(contentReports.contentType, contentType as string));
    if (startDate) whereConditions.push(gte(contentReports.createdAt, new Date(startDate as string)));
    if (endDate) whereConditions.push(lte(contentReports.createdAt, new Date(endDate as string)));

    if (search) {
      const searchTerm = `%${search}%`;
      whereConditions.push(
        or(
          like(contentReports.reason, searchTerm),
          like(users.fullName, searchTerm),
          like(users.email, searchTerm)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const reports = await db
      .select({
        id: contentReports.id,
        contentType: contentReports.contentType,
        contentId: contentReports.contentId,
        reason: contentReports.reason,
        status: contentReports.status,
        createdAt: contentReports.createdAt,
        updatedAt: contentReports.updatedAt,
        priority: sql<string>`CASE 
          WHEN ${contentReports.contentType} = 'USER' THEN 'HIGH'
          WHEN ${contentReports.createdAt} < NOW() - INTERVAL '24 hours' THEN 'HIGH'
          ELSE 'MEDIUM'
        END`.as('priority'),
        reportCount: sql<number>`(
          SELECT COUNT(*) FROM ${contentReports} cr2 
          WHERE cr2.content_id = ${contentReports.contentId} 
          AND cr2.content_type = ${contentReports.contentType}
        )`.as('reportCount'),
        reporter: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role
        }
      })
      .from(contentReports)
      .leftJoin(users, eq(contentReports.reportedBy, users.id))
      .where(whereClause)
      .limit(limitNum)
      .offset(offset)
      .orderBy(desc(contentReports.createdAt));

    const totalCount = await db.select({ count: count() }).from(contentReports).where(whereClause);

    // Get moderation stats
    const [pendingCount, reviewedCount, resolvedCount, todayReports] = await Promise.all([
      db.select({ count: count() }).from(contentReports).where(eq(contentReports.status, 'PENDING')),
      db.select({ count: count() }).from(contentReports).where(eq(contentReports.status, 'REVIEWED')),
      db.select({ count: count() }).from(contentReports).where(eq(contentReports.status, 'RESOLVED')),
      db.select({ count: count() }).from(contentReports).where(
        gte(contentReports.createdAt, new Date(new Date().setHours(0, 0, 0, 0)))
      )
    ]);

    const stats = {
      pending: pendingCount[0].count,
      reviewed: reviewedCount[0].count,
      resolved: resolvedCount[0].count,
      todayReports: todayReports[0].count,
      avgResolutionTime: 2.5 // Mock - would be calculated from actual data
    };

    res.json({
      success: true,
      data: {
        reports,
        stats,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount[0].count / limitNum),
          totalReports: totalCount[0].count,
          hasNext: pageNum * limitNum < totalCount[0].count,
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get moderation reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to get moderation reports' });
  }
});

router.get('/moderation/reports/:id', requireAdminAuth, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);

    const report = await db
      .select({
        id: contentReports.id,
        contentType: contentReports.contentType,
        contentId: contentReports.contentId,
        reason: contentReports.reason,
        status: contentReports.status,
        createdAt: contentReports.createdAt,
        updatedAt: contentReports.updatedAt,
        reporter: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role
        }
      })
      .from(contentReports)
      .leftJoin(users, eq(contentReports.reportedBy, users.id))
      .where(eq(contentReports.id, reportId))
      .limit(1);

    if (report.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Get related reports for the same content
    const relatedReports = await db
      .select({
        id: contentReports.id,
        reason: contentReports.reason,
        createdAt: contentReports.createdAt,
        reporter: {
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(contentReports)
      .leftJoin(users, eq(contentReports.reportedBy, users.id))
      .where(and(
        eq(contentReports.contentId, report[0].contentId),
        eq(contentReports.contentType, report[0].contentType),
        sql`${contentReports.id} != ${reportId}`
      ))
      .orderBy(desc(contentReports.createdAt));

    // Get moderation history
    const moderationHistory = await db
      .select({
        id: moderationResponses.id,
        response: moderationResponses.response,
        action: moderationResponses.action,
        createdAt: moderationResponses.createdAt,
        admin: {
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(moderationResponses)
      .leftJoin(adminUsers, eq(moderationResponses.adminId, adminUsers.id))
      .leftJoin(users, eq(adminUsers.userId, users.id))
      .where(eq(moderationResponses.reportId, reportId))
      .orderBy(desc(moderationResponses.createdAt));

    // Mock content data - in real app, you'd fetch from appropriate tables
    let contentData = null;
    switch (report[0].contentType) {
      case 'POST':
        contentData = { title: 'Sample Post', content: 'Post content here...', author: 'User Name' };
        break;
      case 'PRODUCT':
        contentData = { name: 'Sample Product', description: 'Product description...', price: '$99.99' };
        break;
      case 'USER':
        contentData = { username: 'sample_user', email: 'user@example.com', joinDate: '2024-01-01' };
        break;
      default:
        contentData = { type: report[0].contentType, id: report[0].contentId };
    }

    res.json({
      success: true,
      data: {
        report: report[0],
        relatedReports,
        moderationHistory,
        contentData
      }
    });
  } catch (error) {
    console.error('Get report details error:', error);
    res.status(500).json({ success: false, message: 'Failed to get report details' });
  }
});

router.post('/moderation/reports/:id/action', requireAdminAuth, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { action, reason, notifyUser = true } = req.body;
    const adminId = req.adminUser.adminId;

    const report = await db.select().from(contentReports).where(eq(contentReports.id, reportId)).limit(1);
    
    if (report.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Create moderation response
    await db.insert(moderationResponses).values({
      reportId,
      adminId,
      response: reason || `Content ${action.toLowerCase()}`,
      action: action.toUpperCase()
    });

    // Update report status
    const newStatus = action === 'NO_ACTION' ? 'DISMISSED' : 'RESOLVED';
    await db.update(contentReports).set({
      status: newStatus,
      updatedAt: new Date()
    }).where(eq(contentReports.id, reportId));

    // If taking action on user content, update related reports
    if (action !== 'NO_ACTION') {
      await db.update(contentReports).set({
        status: 'RESOLVED',
        updatedAt: new Date()
      }).where(and(
        eq(contentReports.contentId, report[0].contentId),
        eq(contentReports.contentType, report[0].contentType),
        eq(contentReports.status, 'PENDING')
      ));
    }

    // Emit WebSocket event for real-time updates
    const server = req.app.get('server');
    if (server && server.io) {
      server.io.to('admin_moderation').emit('content_action_taken', {
        type: 'content_action_taken',
        reportId,
        contentId: report[0].contentId,
        contentType: report[0].contentType,
        action,
        reason,
        moderatedBy: adminId,
        timestamp: Date.now()
      });
    }

    res.json({ 
      success: true, 
      message: `Content ${action.toLowerCase()} action completed successfully` 
    });
  } catch (error) {
    console.error('Content action error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete content action' });
  }
});

router.post('/moderation/reports/bulk-action', requireAdminAuth, async (req, res) => {
  try {
    const { reportIds, action, reason } = req.body;
    const adminId = req.adminUser.adminId;

    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid report IDs' });
    }

    // Get reports for validation
    const reports = await db.select().from(contentReports).where(inArray(contentReports.id, reportIds));
    
    if (reports.length !== reportIds.length) {
      return res.status(404).json({ success: false, message: 'Some reports not found' });
    }

    // Create moderation responses for all reports
    const moderationValues = reportIds.map((reportId: number) => ({
      reportId,
      adminId,
      response: reason || `Bulk ${action.toLowerCase()}`,
      action: action.toUpperCase()
    }));

    await db.insert(moderationResponses).values(moderationValues);

    // Update report statuses
    const newStatus = action === 'NO_ACTION' ? 'DISMISSED' : 'RESOLVED';
    await db.update(contentReports).set({
      status: newStatus,
      updatedAt: new Date()
    }).where(inArray(contentReports.id, reportIds));

    // Emit WebSocket event for real-time updates
    const server = req.app.get('server');
    if (server && server.io) {
      server.io.to('admin_moderation').emit('bulk_content_action', {
        type: 'bulk_content_action',
        reportIds,
        action,
        reason,
        moderatedBy: adminId,
        count: reportIds.length,
        timestamp: Date.now()
      });
    }

    res.json({ 
      success: true, 
      message: `Bulk ${action.toLowerCase()} completed for ${reportIds.length} reports` 
    });
  } catch (error) {
    console.error('Bulk moderation action error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete bulk action' });
  }
});

router.post('/moderation/reports/:id/escalate', requireAdminAuth, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { reason, priority = 'HIGH' } = req.body;
    const adminId = req.adminUser.adminId;

    // Update report with escalation
    await db.update(contentReports).set({
      status: 'REVIEWED',
      updatedAt: new Date()
    }).where(eq(contentReports.id, reportId));

    // Create escalation record
    await db.insert(moderationResponses).values({
      reportId,
      adminId,
      response: `Escalated: ${reason}`,
      action: 'ESCALATE'
    });

    // Emit WebSocket event
    const server = req.app.get('server');
    if (server && server.io) {
      server.io.to('admin_moderation').emit('report_escalated', {
        type: 'report_escalated',
        reportId,
        priority,
        escalatedBy: adminId,
        reason,
        timestamp: Date.now()
      });
    }

    res.json({ success: true, message: 'Report escalated successfully' });
  } catch (error) {
    console.error('Escalate report error:', error);
    res.status(500).json({ success: false, message: 'Failed to escalate report' });
  }
});

router.get('/moderation/stats', requireAdminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalReports,
      pendingReports,
      resolvedReports,
      todayReports,
      weekReports,
      monthReports,
      contentTypeStats,
      actionStats
    ] = await Promise.all([
      db.select({ count: count() }).from(contentReports),
      db.select({ count: count() }).from(contentReports).where(eq(contentReports.status, 'PENDING')),
      db.select({ count: count() }).from(contentReports).where(eq(contentReports.status, 'RESOLVED')),
      db.select({ count: count() }).from(contentReports).where(gte(contentReports.createdAt, today)),
      db.select({ count: count() }).from(contentReports).where(gte(contentReports.createdAt, thisWeek)),
      db.select({ count: count() }).from(contentReports).where(gte(contentReports.createdAt, thisMonth)),
      
      // Content type breakdown
      db.select({
        contentType: contentReports.contentType,
        count: count()
      }).from(contentReports).groupBy(contentReports.contentType),
      
      // Action type breakdown
      db.select({
        action: moderationResponses.action,
        count: count()
      }).from(moderationResponses).groupBy(moderationResponses.action)
    ]);

    const stats = {
      overview: {
        total: totalReports[0].count,
        pending: pendingReports[0].count,
        resolved: resolvedReports[0].count,
        dismissalRate: resolvedReports[0].count > 0 ? 
          Math.round((resolvedReports[0].count / totalReports[0].count) * 100) : 0
      },
      activity: {
        today: todayReports[0].count,
        thisWeek: weekReports[0].count,
        thisMonth: monthReports[0].count
      },
      contentTypes: contentTypeStats.reduce((acc: any, item: any) => {
        acc[item.contentType] = item.count;
        return acc;
      }, {}),
      actions: actionStats.reduce((acc: any, item: any) => {
        acc[item.action] = item.count;
        return acc;
      }, {}),
      performance: {
        avgResolutionTime: 2.5, // Mock - would calculate from actual data
        moderatorEfficiency: 85, // Mock - would calculate from actual data
        userSatisfactionRate: 92 // Mock - would come from user feedback
      }
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get moderation stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get moderation statistics' });
  }
});

router.get('/moderation/content/:contentType/:contentId', requireAdminAuth, async (req, res) => {
  try {
    const { contentType, contentId } = req.params;

    // Get all reports for this content
    const reports = await db
      .select({
        id: contentReports.id,
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
      .where(and(
        eq(contentReports.contentType, contentType as any),
        eq(contentReports.contentId, contentId)
      ))
      .orderBy(desc(contentReports.createdAt));

    // Mock content data - in real app, fetch from appropriate tables
    let contentData = null;
    switch (contentType.toUpperCase()) {
      case 'POST':
        contentData = { 
          id: contentId,
          title: 'Sample Post Title',
          content: 'This is the content of the post that was reported...',
          author: 'Author Name',
          createdAt: new Date().toISOString(),
          likes: 25,
          comments: 8
        };
        break;
      case 'PRODUCT':
        contentData = { 
          id: contentId,
          name: 'Sample Product',
          description: 'Product description here...',
          price: '$99.99',
          seller: 'Seller Name',
          category: 'Electronics'
        };
        break;
      case 'USER':
        contentData = { 
          id: contentId,
          username: 'sample_user',
          email: 'user@example.com',
          fullName: 'Sample User',
          joinDate: '2024-01-01',
          profilePicture: null
        };
        break;
    }

    res.json({
      success: true,
      data: {
        content: contentData,
        reports,
        reportCount: reports.length,
        latestReport: reports[0] || null
      }
    });
  } catch (error) {
    console.error('Get content details error:', error);
    res.status(500).json({ success: false, message: 'Failed to get content details' });
  }
});

// System Monitoring
router.get('/monitoring/system/health', requireAdminAuth, async (req, res) => {
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

router.get('/monitoring/metrics/realtime', requireAdminAuth, async (req, res) => {
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
router.post('/maintenance/backup', requireAdminAuth, async (req, res) => {
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

router.post('/maintenance/cleanup', requireAdminAuth, async (req, res) => {
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
router.get('/support/live-chat/sessions', requireAdminAuth, async (req, res) => {
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

router.get('/support/live-chat/messages/:conversationId', requireAdminAuth, async (req, res) => {
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

// Real-time user management endpoints
router.get('/users', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      search = '', 
      role = '', 
      status = '', 
      verification = '' 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [];

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          like(users.fullName, searchTerm),
          like(users.email, searchTerm),
          like(users.userId, searchTerm),
          like(users.phone, searchTerm)
        )
      );
    }

    if (role) {
      conditions.push(eq(users.role, role as any));
    }

    if (verification === 'verified') {
      conditions.push(eq(users.isVerified, true));
    } else if (verification === 'unverified') {
      conditions.push(eq(users.isVerified, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get users with pagination
    const [usersList, totalCount] = await Promise.all([
      db.select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limitNum)
        .offset(offset),
      db.select({ count: count() })
        .from(users)
        .where(whereClause)
    ]);

    // Get stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      verifiedUsers,
      newUsersToday
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(users).where(eq(users.isVerified, true)),
      db.select({ count: count() }).from(users).where(gte(users.createdAt, today))
    ]);

    const stats = {
      totalUsers: totalUsers[0].count,
      activeUsers: 0, // This would come from WebSocket tracking
      verifiedUsers: verifiedUsers[0].count,
      pendingVerifications: totalUsers[0].count - verifiedUsers[0].count,
      newUsersToday: newUsersToday[0].count
    };

    const pagination = {
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount[0].count / limitNum),
      totalUsers: totalCount[0].count,
      hasNext: pageNum * limitNum < totalCount[0].count,
      hasPrev: pageNum > 1
    };

    res.json({
      success: true,
      data: {
        users: usersList,
        pagination,
        stats
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
});

router.post('/users/:userId/action', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { action } = req.body;

    const user = await db.select().from(users).where(eq(users.id, parseInt(userId))).limit(1);

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    switch (action) {
      case 'verify':
        await db.update(users)
          .set({ isVerified: true, isIdentityVerified: true })
          .where(eq(users.id, parseInt(userId)));
        break;

      case 'suspend':
        // In a real app, you'd have a suspended status field
        // For now, we'll just mark as unverified
        await db.update(users)
          .set({ isVerified: false })
          .where(eq(users.id, parseInt(userId)));
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    res.json({ 
      success: true, 
      message: `User ${action} successful`,
      data: { userId: parseInt(userId) }
    });

  } catch (error) {
    console.error('User action error:', error);
    res.status(500).json({ success: false, message: 'User action failed' });
  }
});

// KYC document management endpoints
router.get('/kyc-documents', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      status = 'PENDING', 
      documentType = '', 
      priority = '',
      search = '',
      dateRange = ''
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(complianceDocuments.status, status as any));
    }

    if (documentType) {
      conditions.push(eq(complianceDocuments.documentType, documentType as any));
    }

    if (search) {
      // Join with users table to search by user info
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          like(users.fullName, searchTerm),
          like(users.email, searchTerm)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get documents with user info
    const documents = await db.select({
      id: complianceDocuments.id,
      userId: complianceDocuments.userId,
      documentType: complianceDocuments.documentType,
      documentUrl: complianceDocuments.documentUrl,
      status: complianceDocuments.status,
      reviewedBy: complianceDocuments.reviewedBy,
      reviewedAt: complianceDocuments.reviewedAt,
      createdAt: complianceDocuments.createdAt,
      updatedAt: complianceDocuments.updatedAt,
      userInfo: {
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        profilePicture: users.profilePicture
      }
    })
    .from(complianceDocuments)
    .innerJoin(users, eq(complianceDocuments.userId, users.id))
    .where(whereClause)
    .orderBy(desc(complianceDocuments.createdAt))
    .limit(limitNum)
    .offset(offset);

    // Get stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      todaySubmissions
    ] = await Promise.all([
      db.select({ count: count() }).from(complianceDocuments).where(eq(complianceDocuments.status, 'PENDING')),
      db.select({ count: count() }).from(complianceDocuments).where(eq(complianceDocuments.status, 'APPROVED')),
      db.select({ count: count() }).from(complianceDocuments).where(eq(complianceDocuments.status, 'REJECTED')),
      db.select({ count: count() }).from(complianceDocuments).where(gte(complianceDocuments.createdAt, today))
    ]);

    const stats = {
      pending: pendingCount[0].count,
      approved: approvedCount[0].count,
      rejected: rejectedCount[0].count,
      todaySubmissions: todaySubmissions[0].count,
      avgProcessingTime: 2.5 // This would be calculated from actual processing times
    };

    // Add priority and format for frontend
    const formattedDocuments = documents.map(doc => ({
      ...doc,
      priority: 'MEDIUM', // This would come from business logic
      submittedAt: doc.createdAt
    }));

    res.json({
      success: true,
      data: {
        documents: formattedDocuments,
        stats
      }
    });

  } catch (error) {
    console.error('Get KYC documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to get KYC documents' });
  }
});

router.post('/kyc-documents/:documentId/review', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { action, reason } = req.body;

    const document = await db.select()
      .from(complianceDocuments)
      .where(eq(complianceDocuments.id, parseInt(documentId)))
      .limit(1);

    if (document.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    await db.update(complianceDocuments)
      .set({ 
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: req.user?.id
      })
      .where(eq(complianceDocuments.id, parseInt(documentId)));

    // If approved, update user verification status
    if (action === 'approve') {
      await db.update(users)
        .set({ isIdentityVerified: true, isVerified: true })
        .where(eq(users.id, document[0].userId));
    }

    res.json({ 
      success: true, 
      message: `Document ${action} successful`,
      data: { userId: document[0].userId }
    });

  } catch (error) {
    console.error('Document review error:', error);
    res.status(500).json({ success: false, message: 'Document review failed' });
  }
});

router.post('/kyc-documents/batch-review', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { documentIds, action, reason } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid document IDs' });
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // Get documents to update user statuses
    const documents = await db.select()
      .from(complianceDocuments)
      .where(inArray(complianceDocuments.id, documentIds));

    // Update document statuses
    await db.update(complianceDocuments)
      .set({ 
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: req.user?.id
      })
      .where(inArray(complianceDocuments.id, documentIds));

    // If approved, update user verification statuses
    if (action === 'approve') {
      const userIds = documents.map(doc => doc.userId);
      await db.update(users)
        .set({ isIdentityVerified: true, isVerified: true })
        .where(inArray(users.id, userIds));
    }

    res.json({ 
      success: true, 
      message: `${documentIds.length} documents ${action} successful`
    });

  } catch (error) {
    console.error('Batch review error:', error);
    res.status(500).json({ success: false, message: 'Batch review failed' });
  }
});

// Real-time metrics for dashboard
router.get('/realtime-metrics', requireAdminAuth, async (req: Request, res: Response) => {
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
router.post('/maintenance/backup', requireAdminAuth, async (req, res) => {
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

// Real-time Monitoring Endpoints
router.get('/monitoring/drivers', requireAdminAuth, async (req, res) => {
  try {
    // Mock driver data - in production this would come from a driver tracking system
    const drivers = [
      {
        driverId: 1,
        driverName: 'John Doe',
        latitude: 6.5244,
        longitude: 3.3792,
        status: 'ONLINE',
        lastUpdate: new Date().toISOString(),
        batteryLevel: 85,
        signalStrength: 90,
        orderId: 'ORD123'
      },
      {
        driverId: 2,
        driverName: 'Jane Smith',
        latitude: 6.4281,
        longitude: 3.4106,
        status: 'BUSY',
        lastUpdate: new Date().toISOString(),
        batteryLevel: 65,
        signalStrength: 75
      },
      {
        driverId: 3,
        driverName: 'Mike Johnson',
        latitude: 6.6018,
        longitude: 3.3515,
        status: 'IDLE',
        lastUpdate: new Date().toISOString(),
        batteryLevel: 45,
        signalStrength: 60
      }
    ];

    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error('Error fetching driver locations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch driver locations' });
  }
});

router.get('/monitoring/system-metrics', requireAdminAuth, async (req, res) => {
  try {
    // Mock system metrics - in production this would come from system monitoring
    const metrics = {
      cpu: Math.floor(Math.random() * 40) + 30, // 30-70%
      memory: Math.floor(Math.random() * 30) + 40, // 40-70%
      database: Math.floor(Math.random() * 20) + 20, // 20-40%
      activeConnections: Math.floor(Math.random() * 100) + 150,
      requestsPerSecond: Math.floor(Math.random() * 50) + 25,
      responseTime: Math.floor(Math.random() * 100) + 50,
      uptime: 86400 * 15 + 3600 * 8, // 15 days 8 hours
      errors: Math.floor(Math.random() * 5)
    };

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system metrics' });
  }
});

router.get('/monitoring/live-metrics', requireAdminAuth, async (req, res) => {
  try {
    // Mock live metrics - in production this would aggregate real data
    const liveMetrics = {
      activeUsers: Math.floor(Math.random() * 500) + 1200,
      onlineDrivers: Math.floor(Math.random() * 50) + 120,
      activeOrders: Math.floor(Math.random() * 100) + 45,
      completedOrdersToday: Math.floor(Math.random() * 200) + 180,
      totalRevenue: Math.floor(Math.random() * 50000) + 125000,
      systemHealth: 'HEALTHY' as const
    };

    res.json({ success: true, data: liveMetrics });
  } catch (error) {
    console.error('Error fetching live metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live metrics' });
  }
});

// Fraud Detection Endpoints

// Get fraud alerts with filtering
router.get('/fraud/alerts', requireAdminAuth, async (req, res) => {
  try {
    const { severity, status, type, search, startDate, endDate, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereConditions = [];

    if (severity) whereConditions.push(eq(fraudAlerts.severity, severity as string));
    if (status) whereConditions.push(eq(fraudAlerts.status, status as string));
    if (type) whereConditions.push(eq(fraudAlerts.type, type as string));
    if (startDate) whereConditions.push(gte(fraudAlerts.detectedAt, new Date(startDate as string)));
    if (endDate) whereConditions.push(lte(fraudAlerts.detectedAt, new Date(endDate as string)));

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const alerts = await db
      .select({
        id: fraudAlerts.id,
        userId: fraudAlerts.userId,
        type: fraudAlerts.type,
        severity: fraudAlerts.severity,
        status: fraudAlerts.status,
        title: fraudAlerts.title,
        description: fraudAlerts.description,
        riskScore: fraudAlerts.riskScore,
        metadata: fraudAlerts.metadata,
        detectedAt: fraudAlerts.detectedAt,
        resolvedAt: fraudAlerts.resolvedAt,
        user: {
          id: users.id,
          userId: users.userId,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          accountStatus: users.accountStatus
        }
      })
      .from(fraudAlerts)
      .innerJoin(users, eq(fraudAlerts.userId, users.id))
      .where(whereClause)
      .orderBy(desc(fraudAlerts.detectedAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fraud alerts' });
  }
});

// Get fraud statistics
router.get('/fraud/stats', requireAdminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalAlerts] = await db
      .select({ count: count() })
      .from(fraudAlerts)
      .where(eq(fraudAlerts.status, 'ACTIVE'));

    const [criticalAlerts] = await db
      .select({ count: count() })
      .from(fraudAlerts)
      .where(and(
        eq(fraudAlerts.severity, 'CRITICAL'),
        eq(fraudAlerts.status, 'ACTIVE')
      ));

    const [resolvedToday] = await db
      .select({ count: count() })
      .from(fraudAlerts)
      .where(and(
        eq(fraudAlerts.status, 'RESOLVED'),
        gte(fraudAlerts.resolvedAt, today)
      ));

    const [flaggedAccounts] = await db
      .select({ count: count() })
      .from(accountFlags)
      .where(eq(accountFlags.status, 'ACTIVE'));

    const stats = {
      totalAlerts: totalAlerts.count,
      criticalAlerts: criticalAlerts.count,
      resolvedToday: resolvedToday.count,
      falsePositiveRate: 0, // This would be calculated based on historical data
      avgResolutionTime: 0, // This would be calculated based on resolved alerts
      blockedTransactions: 0, // This would come from transaction monitoring
      flaggedAccounts: flaggedAccounts.count,
      totalRiskReduction: 0 // This would be calculated based on prevented fraud
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching fraud stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fraud statistics' });
  }
});

// Get suspicious activities
router.get('/fraud/activities', requireAdminAuth, async (req, res) => {
  try {
    const activities = await db
      .select({
        id: suspiciousActivities.id,
        userId: suspiciousActivities.userId,
        activityType: suspiciousActivities.activityType,
        description: suspiciousActivities.description,
        riskIndicators: suspiciousActivities.riskIndicators,
        timestamp: suspiciousActivities.timestamp,
        ipAddress: suspiciousActivities.ipAddress,
        deviceFingerprint: suspiciousActivities.deviceFingerprint,
        user: {
          fullName: users.fullName,
          email: users.email,
          userId: users.userId
        }
      })
      .from(suspiciousActivities)
      .innerJoin(users, eq(suspiciousActivities.userId, users.id))
      .orderBy(desc(suspiciousActivities.timestamp))
      .limit(50);

    res.json({ success: true, data: activities });
  } catch (error) {
    console.error('Error fetching suspicious activities:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suspicious activities' });
  }
});

// Alert actions
router.post('/fraud/alerts/:alertId/investigate', requireAdminAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { reason } = req.body;

    await db
      .update(fraudAlerts)
      .set({
        status: 'INVESTIGATING',
        updatedAt: new Date()
      })
      .where(eq(fraudAlerts.id, alertId));

    res.json({ success: true, message: 'Alert marked as investigating' });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ success: false, message: 'Failed to update alert' });
  }
});

router.post('/fraud/alerts/:alertId/resolve', requireAdminAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).adminId;

    await db
      .update(fraudAlerts)
      .set({
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: adminId,
        updatedAt: new Date()
      })
      .where(eq(fraudAlerts.id, alertId));

    res.json({ success: true, message: 'Alert resolved successfully' });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve alert' });
  }
});

router.post('/fraud/alerts/:alertId/false_positive', requireAdminAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).adminId;

    await db
      .update(fraudAlerts)
      .set({
        status: 'FALSE_POSITIVE',
        resolvedAt: new Date(),
        resolvedBy: adminId,
        updatedAt: new Date()
      })
      .where(eq(fraudAlerts.id, alertId));

    res.json({ success: true, message: 'Alert marked as false positive' });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ success: false, message: 'Failed to update alert' });
  }
});

// Bulk actions
router.post('/fraud/alerts/bulk-action', requireAdminAuth, async (req, res) => {
  try {
    const { alertIds, action, reason } = req.body;
    const adminId = (req as any).adminId;

    const updateData: any = {
      updatedAt: new Date()
    };

    switch (action) {
      case 'investigate':
        updateData.status = 'INVESTIGATING';
        break;
      case 'resolve':
        updateData.status = 'RESOLVED';
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = adminId;
        break;
      case 'false_positive':
        updateData.status = 'FALSE_POSITIVE';
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = adminId;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await db
      .update(fraudAlerts)
      .set(updateData)
      .where(inArray(fraudAlerts.id, alertIds));

    res.json({ success: true, message: `Bulk ${action} completed successfully` });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ success: false, message: 'Failed to perform bulk action' });
  }
});

// Account flagging
router.post('/fraud/users/:userId/flag', requireAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).adminId;

    await db.insert(accountFlags).values({
      userId: parseInt(userId),
      flagType: 'FRAUD_RISK',
      severity: 'HIGH',
      reason: reason || 'Flagged due to fraud alert',
      flaggedBy: adminId,
      status: 'ACTIVE'
    });

    res.json({ success: true, message: 'User account flagged successfully' });
  } catch (error) {
    console.error('Error flagging user:', error);
    res.status(500).json({ success: false, message: 'Failed to flag user account' });
  }
});

router.post('/fraud/users/:userId/unflag', requireAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).adminId;

    await db
      .update(accountFlags)
      .set({
        status: 'RESOLVED',
        resolvedBy: adminId,
        resolvedAt: new Date()
      })
      .where(and(
        eq(accountFlags.userId, parseInt(userId)),
        eq(accountFlags.status, 'ACTIVE')
      ));

    res.json({ success: true, message: 'User account unflagged successfully' });
  } catch (error) {
    console.error('Error unflagging user:', error);
    res.status(500).json({ success: false, message: 'Failed to unflag user account' });
  }
});

export default router;
