
import { Router } from 'express';
import { db } from '../db';
import { supportTickets, users, supportResponses } from '../schema';
import { eq, desc, and, like, count, or } from 'drizzle-orm';
import { adminAuth } from '../middleware/auth';

const router = Router();

// Get all support tickets with filtering and pagination
router.get('/tickets', adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      assignedTo, 
      search 
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereClause: any = undefined;

    // Build where clause based on filters
    const conditions = [];
    if (status) conditions.push(eq(supportTickets.status, status as string));
    if (priority) conditions.push(eq(supportTickets.priority, priority as string));
    if (assignedTo) conditions.push(eq(supportTickets.assignedTo, Number(assignedTo)));
    if (search) {
      conditions.push(
        or(
          like(supportTickets.subject, `%${search}%`),
          like(supportTickets.message, `%${search}%`),
          like(supportTickets.name, `%${search}%`),
          like(supportTickets.email, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

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
        updatedAt: supportTickets.updatedAt,
        user: {
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(whereClause)
      .limit(Number(limit))
      .offset(offset)
      .orderBy(desc(supportTickets.createdAt));

    const totalCount = await db.select({ count: count() }).from(supportTickets).where(whereClause);

    res.json({
      success: true,
      data: {
        items: tickets,
        total: totalCount[0].count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount[0].count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to get support tickets' });
  }
});

// Get single support ticket with responses
router.get('/tickets/:ticketId', adminAuth, async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);

    const ticket = await db
      .select()
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (ticket.length === 0) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    // Get responses
    const responses = await db
      .select()
      .from(supportResponses)
      .where(eq(supportResponses.ticketId, ticketId))
      .orderBy(desc(supportResponses.createdAt));

    res.json({
      success: true,
      data: {
        ticket: ticket[0],
        responses
      }
    });
  } catch (error) {
    console.error('Get support ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to get support ticket' });
  }
});

// Update support ticket
router.patch('/tickets/:ticketId', adminAuth, async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const { status, priority, assignedTo, adminNotes } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignedTo) updates.assignedTo = assignedTo;
    if (adminNotes) updates.adminNotes = adminNotes;

    if (status === 'RESOLVED' || status === 'CLOSED') {
      updates.resolvedAt = new Date();
    }

    await db.update(supportTickets).set(updates).where(eq(supportTickets.id, ticketId));

    res.json({ success: true, message: 'Support ticket updated successfully' });
  } catch (error) {
    console.error('Update support ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to update support ticket' });
  }
});

// Respond to support ticket
router.post('/tickets/:ticketId/respond', adminAuth, async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const { response, status } = req.body;

    if (!response) {
      return res.status(400).json({ success: false, message: 'Response is required' });
    }

    // Create response
    await db.insert(supportResponses).values({
      ticketId,
      responderId: req.adminUser.adminId,
      responderType: 'ADMIN',
      message: response,
      createdAt: new Date()
    });

    // Update ticket status if provided
    if (status) {
      const updates: any = { 
        status, 
        updatedAt: new Date() 
      };
      
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updates.resolvedAt = new Date();
      }

      await db.update(supportTickets).set(updates).where(eq(supportTickets.id, ticketId));
    }

    res.json({ success: true, message: 'Response sent successfully' });
  } catch (error) {
    console.error('Respond to ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to send response' });
  }
});

// Get support statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = await db
      .select({
        status: supportTickets.status,
        count: count()
      })
      .from(supportTickets)
      .groupBy(supportTickets.status);

    const formattedStats = {
      total: stats.reduce((sum, stat) => sum + stat.count, 0),
      open: stats.find(s => s.status === 'OPEN')?.count || 0,
      inProgress: stats.find(s => s.status === 'IN_PROGRESS')?.count || 0,
      resolved: stats.find(s => s.status === 'RESOLVED')?.count || 0,
      closed: stats.find(s => s.status === 'CLOSED')?.count || 0
    };

    res.json({ success: true, data: formattedStats });
  } catch (error) {
    console.error('Get support stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get support statistics' });
  }
});

export default router;
