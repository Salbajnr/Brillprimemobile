
import { Express } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateSchema, validateFileUpload, sanitizeInput } from '../middleware/validation';

// Configure multer for document uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'kyc');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `merchant_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG and PDF files are allowed'));
    }
  }
});

const merchantKycSchema = z.object({
  businessRegistrationNumber: z.string().min(5).max(50),
  taxIdentificationNumber: z.string().min(5).max(50),
  businessType: z.enum(['SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'LIMITED_COMPANY', 'CORPORATION']),
  businessAddress: z.string().min(10).max(200),
  businessPhone: z.string().min(10).max(15),
  businessEmail: z.string().email(),
  ownerFullName: z.string().min(2).max(100),
  ownerNationalId: z.string().min(5).max(50),
  bankAccountNumber: z.string().min(10).max(20),
  bankName: z.string().min(2).max(100),
  bankAccountName: z.string().min(2).max(100)
});

export function registerMerchantKycRoutes(app: Express) {
  // Submit merchant KYC documents
  app.post("/api/merchant/kyc/submit", requireAuth, [
    sanitizeInput(),
    upload.fields([
      { name: 'businessRegistration', maxCount: 1 },
      { name: 'taxCertificate', maxCount: 1 },
      { name: 'businessLicense', maxCount: 1 },
      { name: 'ownerIdDocument', maxCount: 1 },
      { name: 'bankStatement', maxCount: 1 },
      { name: 'proofOfAddress', maxCount: 1 }
    ]),
    validateFileUpload({
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
      maxFiles: 6
    }),
    async (req, res) => {
      try {
        const userId = req.session!.userId!;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        // Parse and validate KYC data
        const kycData = merchantKycSchema.parse(JSON.parse(req.body.kycData));
        
        // Check if user is a merchant
        const user = await storage.getUserById(userId);
        if (!user || user.role !== 'MERCHANT') {
          return res.status(403).json({
            status: 'Error',
            message: 'Only merchants can submit KYC documents'
          });
        }

        // Create document URLs
        const documentUrls = {
          businessRegistrationUrl: files.businessRegistration?.[0] ? `/uploads/kyc/${files.businessRegistration[0].filename}` : null,
          taxCertificateUrl: files.taxCertificate?.[0] ? `/uploads/kyc/${files.taxCertificate[0].filename}` : null,
          businessLicenseUrl: files.businessLicense?.[0] ? `/uploads/kyc/${files.businessLicense[0].filename}` : null,
          ownerIdDocumentUrl: files.ownerIdDocument?.[0] ? `/uploads/kyc/${files.ownerIdDocument[0].filename}` : null,
          bankStatementUrl: files.bankStatement?.[0] ? `/uploads/kyc/${files.bankStatement[0].filename}` : null,
          proofOfAddressUrl: files.proofOfAddress?.[0] ? `/uploads/kyc/${files.proofOfAddress[0].filename}` : null
        };

        // Store KYC submission
        const kycSubmission = await storage.createMerchantKycSubmission({
          merchantId: userId,
          ...kycData,
          ...documentUrls,
          status: 'PENDING',
          submittedAt: new Date()
        });

        // Notify admin via WebSocket
        if (global.io) {
          global.io.to('admin_monitoring').emit('new_kyc_submission', {
            type: 'MERCHANT_KYC_SUBMISSION',
            merchantId: userId,
            businessName: kycData.ownerFullName,
            submissionId: kycSubmission.id,
            timestamp: Date.now()
          });
        }

        res.json({
          status: 'Success',
          message: 'KYC documents submitted successfully. Review typically takes 2-3 business days.',
          data: { submissionId: kycSubmission.id }
        });

      } catch (error: any) {
        console.error('Merchant KYC submission error:', error);
        if (error.name === 'ZodError') {
          return res.status(400).json({
            status: 'Error',
            message: 'Invalid KYC data',
            errors: error.errors
          });
        }
        res.status(500).json({
          status: 'Error',
          message: 'Failed to submit KYC documents'
        });
      }
    }
  ]);

  // Get merchant KYC status
  app.get("/api/merchant/kyc/status", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      
      const kycStatus = await storage.getMerchantKycStatus(userId);
      
      res.json({
        status: 'Success',
        data: kycStatus
      });
      
    } catch (error) {
      console.error('Get merchant KYC status error:', error);
      res.status(500).json({
        status: 'Error',
        message: 'Failed to get KYC status'
      });
    }
  });

  // Update business information after KYC approval
  app.put("/api/merchant/kyc/update-business", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const updateData = req.body;
      
      // Check if merchant is KYC verified
      const kycStatus = await storage.getMerchantKycStatus(userId);
      if (!kycStatus || kycStatus.status !== 'APPROVED') {
        return res.status(403).json({
          status: 'Error',
          message: 'Business information can only be updated after KYC approval'
        });
      }

      // Update merchant profile with verified information
      await storage.updateMerchantProfile(userId, {
        businessRegistrationNumber: updateData.businessRegistrationNumber,
        taxIdentificationNumber: updateData.taxIdentificationNumber,
        isKycVerified: true,
        kycCompletedAt: new Date()
      });

      res.json({
        status: 'Success',
        message: 'Business information updated successfully'
      });

    } catch (error) {
      console.error('Update business information error:', error);
      res.status(500).json({
        status: 'Error',
        message: 'Failed to update business information'
      });
    }
  });

  // Get KYC requirements and checklist
  app.get("/api/merchant/kyc/requirements", requireAuth, async (req, res) => {
    try {
      const requirements = {
        requiredDocuments: [
          {
            type: 'businessRegistration',
            name: 'Business Registration Certificate',
            description: 'Certificate of incorporation or business registration',
            required: true,
            formats: ['PDF', 'JPG', 'PNG'],
            maxSize: '10MB'
          },
          {
            type: 'taxCertificate',
            name: 'Tax Identification Certificate',
            description: 'Valid tax identification number certificate',
            required: true,
            formats: ['PDF', 'JPG', 'PNG'],
            maxSize: '10MB'
          },
          {
            type: 'businessLicense',
            name: 'Business License',
            description: 'Valid business operating license',
            required: true,
            formats: ['PDF', 'JPG', 'PNG'],
            maxSize: '10MB'
          },
          {
            type: 'ownerIdDocument',
            name: 'Owner ID Document',
            description: 'Valid government-issued ID of business owner',
            required: true,
            formats: ['PDF', 'JPG', 'PNG'],
            maxSize: '10MB'
          },
          {
            type: 'bankStatement',
            name: 'Bank Statement',
            description: 'Recent business bank statement (last 3 months)',
            required: true,
            formats: ['PDF'],
            maxSize: '10MB'
          },
          {
            type: 'proofOfAddress',
            name: 'Proof of Business Address',
            description: 'Utility bill or lease agreement for business premises',
            required: true,
            formats: ['PDF', 'JPG', 'PNG'],
            maxSize: '10MB'
          }
        ],
        processingTime: '2-3 business days',
        benefits: [
          'Increased customer trust',
          'Higher transaction limits',
          'Access to premium features',
          'Reduced transaction fees',
          'Priority customer support'
        ]
      };

      res.json({
        status: 'Success',
        data: requirements
      });

    } catch (error) {
      console.error('Get KYC requirements error:', error);
      res.status(500).json({
        status: 'Error',
        message: 'Failed to get KYC requirements'
      });
    }
  });
}
