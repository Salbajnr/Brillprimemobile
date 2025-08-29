
import express from "express";
import { db } from "../db";
import { identityVerifications, verificationDocuments, users } from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { authenticateUser, requireAuth } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/verification';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, JPG, PNG) and PDF files are allowed'));
    }
  }
});

// Get user's verification status
router.get("/status", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;

    const [verification] = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.userId, userId))
      .orderBy(desc(identityVerifications.submittedAt))
      .limit(1);

    const documents = await db
      .select()
      .from(verificationDocuments)
      .where(eq(verificationDocuments.userId, userId))
      .orderBy(desc(verificationDocuments.uploadedAt));

    res.json({
      success: true,
      data: {
        verification: verification || null,
        documents: documents || []
      }
    });
  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get verification status' });
  }
});

// Submit identity verification
router.post("/identity", requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const { documentType, documentNumber } = req.body;

    if (!documentType || !documentNumber) {
      return res.status(400).json({
        success: false,
        error: 'Document type and number are required'
      });
    }

    // Check if user already has a pending or approved verification
    const [existingVerification] = await db
      .select()
      .from(identityVerifications)
      .where(and(
        eq(identityVerifications.userId, userId),
        eq(identityVerifications.verificationStatus, 'PENDING')
      ))
      .limit(1);

    if (existingVerification) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending verification request'
      });
    }

    const [newVerification] = await db.insert(identityVerifications).values({
      userId,
      documentType,
      documentNumber,
      verificationStatus: 'PENDING',
      submittedAt: new Date()
    }).returning();

    res.status(201).json({
      success: true,
      data: newVerification
    });
  } catch (error) {
    console.error('Identity verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit verification' });
  }
});

// Upload verification document
router.post("/documents", requireAuth, upload.single('document'), async (req, res) => {
  try {
    const userId = req.session?.userId;
    const { documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Document file is required'
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required'
      });
    }

    const [newDocument] = await db.insert(verificationDocuments).values({
      userId,
      documentType,
      fileName: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'PENDING',
      uploadedAt: new Date()
    }).returning();

    res.status(201).json({
      success: true,
      data: newDocument
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload document' });
  }
});

// Get verification document (for admins)
router.get("/documents/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.session?.user?.role;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const [document] = await db
      .select()
      .from(verificationDocuments)
      .where(eq(verificationDocuments.id, parseInt(id)))
      .limit(1);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const filePath = path.join('uploads/verification', document.fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Document fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch document' });
  }
});

// Review verification (admin only)
router.put("/review/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;
    const userRole = req.session?.user?.role;
    const { status, rejectionReason } = req.body;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can review verifications'
      });
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be APPROVED or REJECTED'
      });
    }

    if (status === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required when rejecting'
      });
    }

    const [updatedVerification] = await db
      .update(identityVerifications)
      .set({
        verificationStatus: status as any,
        reviewedAt: new Date(),
        reviewedBy: userId,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null
      })
      .where(eq(identityVerifications.id, parseInt(id)))
      .returning();

    if (!updatedVerification) {
      return res.status(404).json({
        success: false,
        error: 'Verification not found'
      });
    }

    // Update user verification status
    if (status === 'APPROVED') {
      await db
        .update(users)
        .set({
          isVerified: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, updatedVerification.userId));
    }

    res.json({
      success: true,
      data: updatedVerification
    });
  } catch (error) {
    console.error('Verification review error:', error);
    res.status(500).json({ success: false, error: 'Failed to review verification' });
  }
});

// Get all pending verifications (admin only)
router.get("/pending", requireAuth, async (req, res) => {
  try {
    const userRole = req.session?.user?.role;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view pending verifications'
      });
    }

    const pendingVerifications = await db
      .select({
        id: identityVerifications.id,
        documentType: identityVerifications.documentType,
        documentNumber: identityVerifications.documentNumber,
        submittedAt: identityVerifications.submittedAt,
        userName: users.fullName,
        userEmail: users.email,
        userRole: users.role
      })
      .from(identityVerifications)
      .leftJoin(users, eq(identityVerifications.userId, users.id))
      .where(eq(identityVerifications.verificationStatus, 'PENDING'))
      .orderBy(desc(identityVerifications.submittedAt));

    res.json({
      success: true,
      data: pendingVerifications
    });
  } catch (error) {
    console.error('Pending verifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending verifications' });
  }
});

export default router;
