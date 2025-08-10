
import { Router } from 'express';
import { db } from '../db';
import { users, driverProfiles, verificationDocuments, securityLogs } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation schemas
const documentUploadSchema = z.object({
  documentType: z.enum(['LICENSE', 'NIN', 'PASSPORT', 'VEHICLE_REGISTRATION']),
  documentNumber: z.string().min(5).max(20),
  expiryDate: z.string().optional(),
  additionalInfo: z.string().optional()
});

const biometricVerificationSchema = z.object({
  biometricType: z.enum(['FACE', 'FINGERPRINT']),
  biometricData: z.string(), // Base64 encoded biometric template
  deviceInfo: z.object({
    deviceId: z.string(),
    platform: z.string(),
    version: z.string()
  })
});

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

// Enhanced document upload with AI validation
router.post('/documents/upload', requireAuth, upload.single('document'), async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const data = documentUploadSchema.parse(req.body);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Document image is required'
      });
    }

    // Process and optimize image
    const processedImage = await sharp(req.file.buffer)
      .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate secure filename
    const fileHash = crypto.createHash('sha256').update(processedImage).digest('hex');
    const fileName = `${userId}_${data.documentType}_${Date.now()}_${fileHash.substring(0, 8)}.jpg`;

    // AI-powered document validation (simulated)
    const validationResult = await validateDocument(processedImage, data.documentType);

    // Store document information
    const [document] = await db.insert(verificationDocuments).values({
      userId,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      fileName,
      fileSize: processedImage.length,
      mimeType: 'image/jpeg',
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      validationScore: validationResult.confidence,
      extractedData: JSON.stringify(validationResult.extractedData),
      status: validationResult.confidence > 0.8 ? 'VERIFIED' : 'PENDING_REVIEW',
      uploadedAt: new Date()
    }).returning();

    // Log verification attempt
    await db.insert(securityLogs).values({
      userId,
      action: 'DOCUMENT_UPLOAD',
      details: JSON.stringify({
        documentType: data.documentType,
        validationScore: validationResult.confidence,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }),
      severity: 'INFO',
      timestamp: new Date()
    });

    // Real-time verification status update
    if (global.io) {
      global.io.to(`user_${userId}`).emit('verification_update', {
        type: 'DOCUMENT_UPLOADED',
        documentType: data.documentType,
        status: document.status,
        validationScore: validationResult.confidence,
        timestamp: Date.now()
      });

      // Notify admin for manual review if needed
      if (validationResult.confidence < 0.8) {
        global.io.to('admin_verification').emit('verification_review_needed', {
          userId,
          documentId: document.id,
          documentType: data.documentType,
          validationScore: validationResult.confidence,
          timestamp: Date.now()
        });
      }
    }

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        type: document.documentType,
        status: document.status,
        validationScore: validationResult.confidence,
        uploadedAt: document.uploadedAt
      }
    });

  } catch (error: any) {
    console.error('Document upload error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload document'
    });
  }
});

// Biometric verification endpoint
router.post('/biometric/verify', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const data = biometricVerificationSchema.parse(req.body);

    // Process biometric data
    const biometricTemplate = await processBiometricData(data.biometricData, data.biometricType);
    
    // Store biometric template securely
    const hashedTemplate = crypto.createHash('sha256').update(biometricTemplate).digest('hex');
    
    // Update user verification status
    await db.update(users).set({
      biometricHash: hashedTemplate,
      biometricType: data.biometricType,
      isVerified: true,
      updatedAt: new Date()
    }).where(eq(users.id, userId));

    // Log biometric verification
    await db.insert(securityLogs).values({
      userId,
      action: 'BIOMETRIC_VERIFICATION',
      details: JSON.stringify({
        biometricType: data.biometricType,
        deviceInfo: data.deviceInfo,
        ipAddress: req.ip
      }),
      severity: 'INFO',
      timestamp: new Date()
    });

    // Real-time notification
    if (global.io) {
      global.io.to(`user_${userId}`).emit('verification_update', {
        type: 'BIOMETRIC_VERIFIED',
        biometricType: data.biometricType,
        status: 'VERIFIED',
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: 'Biometric verification completed successfully',
      verificationLevel: 'FULL'
    });

  } catch (error: any) {
    console.error('Biometric verification error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Biometric verification failed'
    });
  }
});

// Get verification status with detailed progress
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;

    // Get user and documents
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const documents = await db.select().from(verificationDocuments).where(eq(verificationDocuments.userId, userId));

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate verification progress
    const requiredDocuments = user.role === 'DRIVER' 
      ? ['LICENSE', 'VEHICLE_REGISTRATION'] 
      : ['NIN'];

    const verifiedDocuments = documents.filter(doc => doc.status === 'VERIFIED');
    const documentProgress = (verifiedDocuments.length / requiredDocuments.length) * 100;

    const verificationStatus = {
      overall: {
        isVerified: user.isVerified,
        level: getVerificationLevel(user, documents),
        progress: Math.min(100, documentProgress + (user.biometricHash ? 20 : 0))
      },
      email: {
        verified: user.emailVerified,
        email: user.email
      },
      phone: {
        verified: user.phoneVerified,
        phone: user.phone
      },
      biometric: {
        verified: !!user.biometricHash,
        type: user.biometricType
      },
      documents: documents.map(doc => ({
        id: doc.id,
        type: doc.documentType,
        status: doc.status,
        validationScore: doc.validationScore,
        uploadedAt: doc.uploadedAt,
        expiryDate: doc.expiryDate
      })),
      requiredSteps: getRequiredSteps(user, documents),
      lastUpdate: new Date().toISOString()
    };

    res.json({
      success: true,
      verification: verificationStatus
    });

  } catch (error: any) {
    console.error('Verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification status'
    });
  }
});

// Enhanced KYC verification for drivers
router.post('/kyc/enhanced', requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { 
      personalInfo, 
      addressInfo, 
      emergencyContact, 
      bankDetails,
      vehicleInfo 
    } = req.body;

    // Validate all required information
    const kycData = {
      personalInfo: {
        fullName: personalInfo.fullName,
        dateOfBirth: personalInfo.dateOfBirth,
        nationality: personalInfo.nationality,
        stateOfOrigin: personalInfo.stateOfOrigin
      },
      addressInfo: {
        street: addressInfo.street,
        city: addressInfo.city,
        state: addressInfo.state,
        postalCode: addressInfo.postalCode
      },
      emergencyContact: {
        name: emergencyContact.name,
        relationship: emergencyContact.relationship,
        phone: emergencyContact.phone
      },
      bankDetails: {
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
        bankName: bankDetails.bankName,
        bankCode: bankDetails.bankCode
      }
    };

    // Update driver profile with KYC data
    await db.update(driverProfiles).set({
      kycData: JSON.stringify(kycData),
      kycStatus: 'PENDING_REVIEW',
      kycSubmittedAt: new Date(),
      updatedAt: new Date()
    }).where(eq(driverProfiles.userId, userId));

    // Log KYC submission
    await db.insert(securityLogs).values({
      userId,
      action: 'KYC_SUBMISSION',
      details: JSON.stringify({ kycLevel: 'ENHANCED' }),
      severity: 'INFO',
      timestamp: new Date()
    });

    // Notify admin for review
    if (global.io) {
      global.io.to('admin_kyc').emit('kyc_review_needed', {
        userId,
        submissionType: 'ENHANCED_KYC',
        timestamp: Date.now()
      });

      global.io.to(`user_${userId}`).emit('verification_update', {
        type: 'KYC_SUBMITTED',
        status: 'PENDING_REVIEW',
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: 'Enhanced KYC submitted successfully',
      status: 'PENDING_REVIEW'
    });

  } catch (error: any) {
    console.error('Enhanced KYC error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'KYC submission failed'
    });
  }
});

// AI-powered document validation (simulated)
async function validateDocument(imageBuffer: Buffer, documentType: string) {
  // In production, this would integrate with actual AI/ML services
  // For now, we'll simulate the validation process
  
  const confidence = Math.random() * 0.4 + 0.6; // 0.6 - 1.0
  
  const extractedData: any = {
    documentType,
    textConfidence: confidence,
    faceDetected: documentType === 'LICENSE' || documentType === 'NIN',
    securityFeatures: Math.random() > 0.3
  };

  // Simulate specific data extraction based on document type
  switch (documentType) {
    case 'LICENSE':
      extractedData.licenseNumber = `LIC${Math.random().toString().substring(2, 10)}`;
      extractedData.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2);
      break;
    case 'NIN':
      extractedData.ninNumber = Math.random().toString().substring(2, 13);
      break;
    case 'VEHICLE_REGISTRATION':
      extractedData.plateNumber = `ABC${Math.random().toString().substring(2, 5)}XY`;
      break;
  }

  return {
    confidence,
    extractedData,
    securityChecks: {
      tamperDetection: confidence > 0.8,
      qualityCheck: confidence > 0.7,
      formatValidation: true
    }
  };
}

// Process biometric data (simulated)
async function processBiometricData(biometricData: string, type: string): Promise<string> {
  // In production, this would process actual biometric templates
  // For now, we'll create a mock template
  const processed = crypto.createHash('sha256').update(biometricData + type).digest('hex');
  return processed;
}

// Calculate verification level
function getVerificationLevel(user: any, documents: any[]): string {
  const verifiedDocs = documents.filter(doc => doc.status === 'VERIFIED').length;
  const hasBiometric = !!user.biometricHash;
  const hasEmailPhone = user.emailVerified && user.phoneVerified;

  if (verifiedDocs >= 2 && hasBiometric && hasEmailPhone) return 'PREMIUM';
  if (verifiedDocs >= 1 && (hasBiometric || hasEmailPhone)) return 'STANDARD';
  if (hasEmailPhone) return 'BASIC';
  return 'UNVERIFIED';
}

// Get required verification steps
function getRequiredSteps(user: any, documents: any[]) {
  const steps = [];
  
  if (!user.emailVerified) steps.push('EMAIL_VERIFICATION');
  if (!user.phoneVerified) steps.push('PHONE_VERIFICATION');
  
  const requiredDocs = user.role === 'DRIVER' ? ['LICENSE', 'VEHICLE_REGISTRATION'] : ['NIN'];
  const verifiedDocs = documents.filter(doc => doc.status === 'VERIFIED').map(doc => doc.documentType);
  
  requiredDocs.forEach(docType => {
    if (!verifiedDocs.includes(docType)) {
      steps.push(`${docType}_UPLOAD`);
    }
  });
  
  if (!user.biometricHash) steps.push('BIOMETRIC_VERIFICATION');
  
  return steps;
}

export default router;
