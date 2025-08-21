
import express from 'express';
import { db } from '../db';
import { supportTickets, supportResponses, users, adminUsers } from '../../shared/schema';
import { eq, desc, and, count, sql, ilike, or } from 'drizzle-orm';

const router = express.Router();

// Middleware to check admin authentication
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session?.userId || !req.session?.userRole || req.session.userRole !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

router.use(requireAdmin);

// Get all support tickets with filtering
router.get('/tickets', async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = db.select({
      id: supportTickets.id,
      ticketNumber: supportTickets.ticketNumber,
      userId: supportTickets.userId,
      userRole: supportTickets.userRole,
      name: supportTickets.name,
      email: supportTickets.email,
      subject: supportTickets.subject,
      status: supportTickets.status,
      priority: supportTickets.priority,
      assignedTo: supportTickets.assignedTo,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      resolvedAt: supportTickets.resolvedAt
    }).from(supportTickets);

    // Apply filters
    const conditions = [];
    if (status) {
      conditions.push(eq(supportTickets.status, status as string));
    }
    if (priority) {
      conditions.push(eq(supportTickets.priority, priority as string));
    }
    if (search) {
      conditions.push(
        or(
          ilike(supportTickets.subject, `%${search}%`),
          ilike(supportTickets.name, `%${search}%`),
          ilike(supportTickets.email, `%${search}%`),
          ilike(supportTickets.ticketNumber, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const tickets = await query
      .orderBy(desc(supportTickets.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    // Get total count for pagination
    const [totalResult] = await db.select({ count: count() })
      .from(supportTickets)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({
      success: true,
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        userId: ticket.userId,
        userRole: ticket.userRole,
        name: ticket.name,
        email: ticket.email,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: ticket.assignedTo,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt
      })),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalResult.count,
        pages: Math.ceil(totalResult.count / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
});

// Get ticket details for admin
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    const [ticket] = await db.select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Get responses
    const responses = await db.select({
      id: supportResponses.id,
      message: supportResponses.message,
      responderType: supportResponses.responderType,
      responderId: supportResponses.responderId,
      createdAt: supportResponses.createdAt,
      attachments: supportResponses.attachments
    }).from(supportResponses)
      .where(eq(supportResponses.ticketId, ticketId))
      .orderBy(supportResponses.createdAt);

    // Get user details
    const [user] = await db.select({
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    }).from(users)
      .where(eq(users.id, ticket.userId));

    res.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        userId: ticket.userId,
        userRole: ticket.userRole,
        name: ticket.name,
        email: ticket.email,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: ticket.assignedTo,
        adminNotes: ticket.adminNotes,
        resolution: ticket.resolution,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        user: user || null
      },
      responses: responses.map(response => ({
        id: response.id,
        message: response.message,
        responderType: response.responderType,
        responderId: response.responderId,
        createdAt: response.createdAt,
        attachments: response.attachments ? JSON.parse(response.attachments) : []
      }))
    });
  } catch (error) {
    console.error('Error fetching admin ticket details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ticket details' });
  }
});

// Update ticket (assign, change status, add notes)
router.put('/tickets/:id', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { status, priority, assignedTo, adminNotes, resolution } = req.body;

    const updates: any = {
      updatedAt: new Date()
    };

    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (adminNotes) updates.adminNotes = adminNotes;
    if (resolution) updates.resolution = resolution;
    if (status === 'RESOLVED') updates.resolvedAt = new Date();

    const [updatedTicket] = await db.update(supportTickets)
      .set(updates)
      .where(eq(supportTickets.id, ticketId))
      .returning();

    if (!updatedTicket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Broadcast update to user and admins
    if (global.io) {
      global.io.to(`user_${updatedTicket.userId}`).emit('ticket_updated', {
        ticketId: updatedTicket.id,
        status: updatedTicket.status,
        updatedAt: updatedTicket.updatedAt
      });

      global.io.to('admin_dashboard').emit('ticket_updated', {
        ticketId: updatedTicket.id,
        status: updatedTicket.status,
        assignedTo: updatedTicket.assignedTo
      });
    }

    res.json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
        priority: updatedTicket.priority,
        assignedTo: updatedTicket.assignedTo,
        adminNotes: updatedTicket.adminNotes,
        resolution: updatedTicket.resolution,
        updatedAt: updatedTicket.updatedAt,
        resolvedAt: updatedTicket.resolvedAt
      }
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
});

// Add admin response to ticket
router.post('/tickets/:id/responses', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { message, changeStatus } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Create response
    const [response] = await db.insert(supportResponses).values({
      ticketId,
      responderId: req.session.userId,
      responderType: 'ADMIN',
      message
    }).returning();

    // Update ticket status if requested
    if (changeStatus) {
      const updates: any = { 
        status: changeStatus, 
        updatedAt: new Date() 
      };
      
      if (changeStatus === 'RESOLVED') {
        updates.resolvedAt = new Date();
      }

      await db.update(supportTickets)
        .set(updates)
        .where(eq(supportTickets.id, ticketId));
    }

    // Get ticket details for broadcasting
    const [ticket] = await db.select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId));

    // Broadcast to user and admins
    if (global.io && ticket) {
      global.io.to(`user_${ticket.userId}`).emit('ticket_response', {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        responseType: 'ADMIN',
        message,
        createdAt: response.createdAt,
        status: changeStatus || ticket.status
      });

      global.io.to('admin_dashboard').emit('ticket_response', {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        responseType: 'ADMIN',
        adminId: req.session.userId
      });
    }

    res.status(201).json({
      success: true,
      response: {
        id: response.id,
        message: response.message,
        responderType: response.responderType,
        createdAt: response.createdAt
      }
    });
  } catch (error) {
    console.error('Error adding admin response:', error);
    res.status(500).json({ success: false, message: 'Failed to add response' });
  }
});

// Get support dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [stats] = await db.select({
      totalTickets: count(),
      openTickets: count(supportTickets.id).filter(eq(supportTickets.status, 'OPEN')),
      inProgressTickets: count(supportTickets.id).filter(eq(supportTickets.status, 'IN_PROGRESS')),
      resolvedTickets: count(supportTickets.id).filter(eq(supportTickets.status, 'RESOLVED')),
      urgentTickets: count(supportTickets.id).filter(eq(supportTickets.priority, 'URGENT')),
      unassignedTickets: count(supportTickets.id).filter(sql`assigned_to IS NULL`)
    }).from(supportTickets);

    // Get recent tickets
    const recentTickets = await db.select({
      id: supportTickets.id,
      ticketNumber: supportTickets.ticketNumber,
      subject: supportTickets.subject,
      status: supportTickets.status,
      priority: supportTickets.priority,
      createdAt: supportTickets.createdAt
    }).from(supportTickets)
      .orderBy(desc(supportTickets.createdAt))
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalTickets: stats.totalTickets || 0,
        openTickets: stats.openTickets || 0,
        inProgressTickets: stats.inProgressTickets || 0,
        resolvedTickets: stats.resolvedTickets || 0,
        urgentTickets: stats.urgentTickets || 0,
        unassignedTickets: stats.unassignedTickets || 0
      },
      recentTickets: recentTickets.map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// Bulk actions on tickets
router.post('/tickets/bulk', async (req, res) => {
  try {
    const { ticketIds, action, value } = req.body;

    if (!ticketIds || !Array.isArray(ticketIds) || !action) {
      return res.status(400).json({ success: false, message: 'Invalid bulk action data' });
    }

    const updates: any = { updatedAt: new Date() };

    switch (action) {
      case 'assign':
        updates.assignedTo = value;
        break;
      case 'status':
        updates.status = value;
        if (value === 'RESOLVED') {
          updates.resolvedAt = new Date();
        }
        break;
      case 'priority':
        updates.priority = value;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await db.update(supportTickets)
      .set(updates)
      .where(sql`id = ANY(${ticketIds})`);

    // Broadcast updates
    if (global.io) {
      global.io.to('admin_dashboard').emit('tickets_bulk_updated', {
        ticketIds,
        action,
        value,
        updatedAt: updates.updatedAt
      });
    }

    res.json({
      success: true,
      message: `Successfully updated ${ticketIds.length} tickets`,
      updatedCount: ticketIds.length
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ success: false, message: 'Failed to perform bulk action' });
  }
});

export default router;
