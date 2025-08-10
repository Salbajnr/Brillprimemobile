
import { Router } from 'express';
import { db } from '../db';
import { supportTickets, users } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Submit support ticket
router.post('/submit', async (req, res) => {
  try {
    const { subject, message, priority, category, name, email, phone } = req.body;

    if (!subject || !message || !name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject, message, name, and email are required' 
      });
    }

    // Generate ticket number
    const ticketNumber = `TICKET-${Date.now().toString().slice(-8)}`;

    // Get user ID if authenticated
    let userId = null;
    if (req.session?.userId) {
      userId = req.session.userId;
    }

    // Determine user role
    let userRole = 'GUEST';
    if (userId) {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length > 0) {
        userRole = user[0].role;
      }
    }

    const ticket = await db.insert(supportTickets).values({
      ticketNumber,
      userId,
      userRole,
      name,
      email,
      subject,
      message,
      priority: priority || 'NORMAL',
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully',
      ticketNumber,
      data: ticket[0]
    });
  } catch (error) {
    console.error('Submit support ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit support ticket' });
  }
});

// Get user's support tickets
router.get('/my-tickets', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const tickets = await db
      .select({
        id: supportTickets.id,
        ticketNumber: supportTickets.ticketNumber,
        subject: supportTickets.subject,
        status: supportTickets.status,
        priority: supportTickets.priority,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt
      })
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));

    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to get support tickets' });
  }
});

// Get single ticket details
router.get('/tickets/:ticketNumber', async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const userId = req.session?.userId;

    let ticket;
    if (userId) {
      // User can only see their own tickets
      ticket = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.ticketNumber, ticketNumber))
        .where(eq(supportTickets.userId, userId))
        .limit(1);
    } else {
      // Guest tickets can be viewed by ticket number and email
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email required for guest tickets' });
      }
      
      ticket = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.ticketNumber, ticketNumber))
        .where(eq(supportTickets.email, email as string))
        .limit(1);
    }

    if (ticket.length === 0) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    res.json({ success: true, data: ticket[0] });
  } catch (error) {
    console.error('Get ticket details error:', error);
    res.status(500).json({ success: false, message: 'Failed to get ticket details' });
  }
});

export default router;
