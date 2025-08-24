
import express from 'express';
import { db } from '../db';
import { supportTickets, supportResponses, users, adminUsers } from '../../shared/schema';
import { eq, desc, and, count, isNull } from 'drizzle-orm';
import { storage } from '../storage';

const router = express.Router();

// Get all support tickets for a user
router.get('/tickets', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const tickets = await db.select({
      id: supportTickets.id,
      ticketNumber: supportTickets.ticketNumber,
      subject: supportTickets.subject,
      status: supportTickets.status,
      priority: supportTickets.priority,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      resolvedAt: supportTickets.resolvedAt
    }).from(supportTickets)
      .where(eq(supportTickets.userId, req.session.userId))
      .orderBy(desc(supportTickets.createdAt));

    res.json({
      success: true,
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
});

// Create a new support ticket
router.post('/tickets', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { subject, message, priority = 'NORMAL' } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    // Get user details
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate ticket number
    const ticketCount = await db.select({ count: count() }).from(supportTickets);
    const ticketNumber = `BP-${Date.now()}-${(ticketCount[0]?.count || 0) + 1}`;

    // Create ticket
    const [ticket] = await db.insert(supportTickets).values({
      ticketNumber,
      userId: req.session.userId,
      userRole: req.session.userRole || 'CONSUMER',
      name: user.fullName,
      email: user.email,
      subject,
      message,
      priority,
      status: 'OPEN'
    }).returning();

    // Broadcast to admin dashboard if WebSocket is available
    if (global.io) {
      global.io.to('admin_dashboard').emit('new_support_ticket', {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
        userRole: ticket.userRole,
        createdAt: ticket.createdAt
      });
    }

    res.status(201).json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
});

// Get ticket details with responses
router.get('/tickets/:id', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const ticketId = parseInt(req.params.id);

    // Get ticket details
    const [ticket] = await db.select()
      .from(supportTickets)
      .where(and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.userId, req.session.userId)
      ));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Get responses
    const responses = await db.select({
      id: supportResponses.id,
      message: supportResponses.message,
      responderType: supportResponses.responderType,
      createdAt: supportResponses.createdAt,
      attachments: supportResponses.attachments
    }).from(supportResponses)
      .where(eq(supportResponses.ticketId, ticketId))
      .orderBy(supportResponses.createdAt);

    res.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        priority: ticket.priority,
        adminNotes: ticket.adminNotes,
        resolution: ticket.resolution,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt
      },
      responses: responses.map(response => ({
        id: response.id,
        message: response.message,
        responderType: response.responderType,
        createdAt: response.createdAt,
        attachments: response.attachments ? JSON.parse(response.attachments) : []
      }))
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ticket details' });
  }
});

// Add response to ticket
router.post('/tickets/:id/responses', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const ticketId = parseInt(req.params.id);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Verify ticket ownership
    const [ticket] = await db.select()
      .from(supportTickets)
      .where(and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.userId, req.session.userId)
      ));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Create response
    const [response] = await db.insert(supportResponses).values({
      ticketId,
      responderId: req.session.userId,
      responderType: 'USER',
      message
    }).returning();

    // Update ticket status if it was resolved
    if (ticket.status === 'RESOLVED') {
      await db.update(supportTickets)
        .set({ status: 'OPEN', updatedAt: new Date() })
        .where(eq(supportTickets.id, ticketId));
    }

    // Broadcast to admin dashboard
    if (global.io) {
      global.io.to('admin_dashboard').emit('ticket_response', {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        responseType: 'USER',
        message,
        createdAt: response.createdAt
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
    console.error('Error adding response:', error);
    res.status(500).json({ success: false, message: 'Failed to add response' });
  }
});

// Get support statistics for user dashboard
router.get('/stats', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const [stats] = await db.select({
      totalTickets: count(),
      openTickets: count(supportTickets.id).filter(eq(supportTickets.status, 'OPEN')),
      resolvedTickets: count(supportTickets.id).filter(eq(supportTickets.status, 'RESOLVED'))
    }).from(supportTickets)
      .where(eq(supportTickets.userId, req.session.userId));

    res.json({
      success: true,
      stats: {
        totalTickets: stats.totalTickets || 0,
        openTickets: stats.openTickets || 0,
        resolvedTickets: stats.resolvedTickets || 0
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

export default router;
