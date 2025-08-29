
import express from "express";
import { db } from "../db";
import { supportTickets, chatMessages, users } from "../../shared/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { authenticateUser, requireAuth } from "../middleware/auth";

const router = express.Router();

// Get user's support tickets
router.get("/tickets", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    let whereCondition;
    if (userRole === 'ADMIN') {
      // Admins can see all tickets
      whereCondition = undefined;
    } else {
      // Users can only see their own tickets
      whereCondition = eq(supportTickets.userId, userId);
    }

    const tickets = await db
      .select({
        id: supportTickets.id,
        title: supportTickets.title,
        description: supportTickets.description,
        category: supportTickets.category,
        priority: supportTickets.priority,
        status: supportTickets.status,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        userName: users.fullName,
        userEmail: users.email
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(whereCondition)
      .orderBy(desc(supportTickets.createdAt));

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error('Support tickets fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch support tickets' });
  }
});

// Get specific support ticket
router.get("/tickets/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;

    let whereConditions = [eq(supportTickets.id, parseInt(id))];
    
    // Non-admin users can only view their own tickets
    if (userRole !== 'ADMIN') {
      whereConditions.push(eq(supportTickets.userId, userId));
    }

    const [ticket] = await db
      .select({
        id: supportTickets.id,
        title: supportTickets.title,
        description: supportTickets.description,
        category: supportTickets.category,
        priority: supportTickets.priority,
        status: supportTickets.status,
        attachments: supportTickets.attachments,
        metadata: supportTickets.metadata,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        userName: users.fullName,
        userEmail: users.email,
        assignedTo: supportTickets.assignedTo
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(and(...whereConditions))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    // Get chat messages for this ticket
    const messages = await db
      .select({
        id: chatMessages.id,
        message: chatMessages.message,
        messageType: chatMessages.messageType,
        attachments: chatMessages.attachments,
        createdAt: chatMessages.createdAt,
        senderName: users.fullName,
        senderId: chatMessages.senderId
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderId, users.id))
      .where(eq(chatMessages.supportTicketId, parseInt(id)))
      .orderBy(chatMessages.createdAt);

    res.json({
      success: true,
      data: {
        ticket,
        messages
      }
    });
  } catch (error) {
    console.error('Support ticket fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch support ticket' });
  }
});

// Create new support ticket
router.post("/tickets", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const {
      title,
      description,
      category,
      priority = 'MEDIUM',
      attachments = []
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, and category are required'
      });
    }

    const validCategories = ['TECHNICAL', 'BILLING', 'GENERAL', 'COMPLAINT', 'FEATURE_REQUEST'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid priority'
      });
    }

    const [newTicket] = await db.insert(supportTickets).values({
      userId,
      title,
      description,
      category,
      priority,
      status: 'OPEN',
      attachments: JSON.stringify(attachments),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.status(201).json({
      success: true,
      data: newTicket
    });
  } catch (error) {
    console.error('Support ticket creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create support ticket' });
  }
});

// Update support ticket (admin only)
router.put("/tickets/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.session?.user?.role;
    const {
      status,
      priority,
      assignedTo
    } = req.body;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update support tickets'
      });
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (status) {
      const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }
      updateData.status = status;
    }

    if (priority) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid priority'
        });
      }
      updateData.priority = priority;
    }

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
    }

    const [updatedTicket] = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, parseInt(id)))
      .returning();

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.json({
      success: true,
      data: updatedTicket
    });
  } catch (error) {
    console.error('Support ticket update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update support ticket' });
  }
});

// Add message to support ticket
router.post("/tickets/:id/messages", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;
    const {
      message,
      messageType = 'TEXT',
      attachments = []
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Verify user can access this ticket
    let whereConditions = [eq(supportTickets.id, parseInt(id))];
    if (userRole !== 'ADMIN') {
      whereConditions.push(eq(supportTickets.userId, userId));
    }

    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(and(...whereConditions))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found or access denied'
      });
    }

    const [newMessage] = await db.insert(chatMessages).values({
      senderId: userId,
      recipientId: ticket.userId, // Will be null for customer messages
      supportTicketId: parseInt(id),
      message,
      messageType,
      attachments: JSON.stringify(attachments),
      createdAt: new Date()
    }).returning();

    // Update ticket status if it was resolved/closed and customer is responding
    if (userRole !== 'ADMIN' && ['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      await db
        .update(supportTickets)
        .set({
          status: 'OPEN',
          updatedAt: new Date()
        })
        .where(eq(supportTickets.id, parseInt(id)));
    }

    res.status(201).json({
      success: true,
      data: newMessage
    });
  } catch (error) {
    console.error('Support message creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to add message' });
  }
});

// Get support statistics (admin only)
router.get("/statistics", requireAuth, async (req, res) => {
  try {
    const userRole = req.session?.user?.role;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view support statistics'
      });
    }

    const [totalTickets] = await db
      .select({ count: count() })
      .from(supportTickets);

    const [openTickets] = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(eq(supportTickets.status, 'OPEN'));

    const [inProgressTickets] = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(eq(supportTickets.status, 'IN_PROGRESS'));

    const [resolvedTickets] = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(eq(supportTickets.status, 'RESOLVED'));

    res.json({
      success: true,
      data: {
        totalTickets: totalTickets.count,
        openTickets: openTickets.count,
        inProgressTickets: inProgressTickets.count,
        resolvedTickets: resolvedTickets.count
      }
    });
  } catch (error) {
    console.error('Support statistics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch support statistics' });
  }
});

export default router;
