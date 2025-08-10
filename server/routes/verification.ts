import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "../storage";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG and PNG files are allowed'));
    }
  }
});

import { validateSchema, validateFileUpload, sanitizeInput } from '../middleware/validation';
import { z } from 'zod';

const verificationDataSchema = z.object({
  licenseNumber: z.string().min(3).max(50).optional(),
  licenseExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vehicleType: z.enum(['MOTORCYCLE', 'CAR', 'VAN', 'TRUCK']).optional(),
  vehiclePlate: z.string().min(3).max(20).optional(),
  vehicleModel: z.string().min(1).max(50).optional(),
  vehicleYear: z.coerce.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  phoneVerification: z.boolean().optional()
});

const submitVerificationSchema = z.object({
  userId: z.coerce.number().positive(),
  role: z.enum(['CONSUMER', 'MERCHANT', 'DRIVER']),
  verificationData: z.string().transform((data, ctx) => {
    try {
      const parsed = JSON.parse(data);
      return verificationDataSchema.parse(parsed);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid verification data format'
      });
      return z.NEVER;
    }
  })
});

export const submitIdentityVerification = [
  sanitizeInput(),
  upload.fields([
    { name: 'faceImage', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 }
  ]),
  validateFileUpload({
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    maxFiles: 2
  }),
  validateSchema(submitVerificationSchema),
  async (req: Request, res: Response) => {
    try {
      const { userId, role, verificationData } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      const parsedData = verificationData;
      
      // Handle face image upload
      let faceImageUrl = null;
      if (files.faceImage && files.faceImage[0]) {
        faceImageUrl = `/uploads/${files.faceImage[0].filename}`;
      }
      
      // Create identity verification record
      const identityVerification = await storage.createIdentityVerification({
        userId: parseInt(userId),
        faceImageUrl,
        verificationStatus: 'PENDING'
      });
      
      // Handle driver-specific verification
      if (role === 'DRIVER') {
        let licenseImageUrl = null;
        if (files.licenseImage && files.licenseImage[0]) {
          licenseImageUrl = `/uploads/${files.licenseImage[0].filename}`;
        }
        
        await storage.createDriverVerification({
          userId: parseInt(userId),
          licenseNumber: parsedData.licenseNumber,
          licenseExpiryDate: parsedData.licenseExpiry,
          licenseImageUrl,
          vehicleType: parsedData.vehicleType,
          vehiclePlate: parsedData.vehiclePlate,
          vehicleModel: parsedData.vehicleModel,
          vehicleYear: parsedData.vehicleYear,
          verificationStatus: 'PENDING'
        });
      }
      
      // Handle phone verification for consumers
      if (role === 'CONSUMER' && parsedData.phoneVerification) {
        // Generate OTP for phone verification
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await storage.createPhoneVerification({
          userId: parseInt(userId),
          phoneNumber: req.user?.phone || '',
          otpCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          isVerified: false
        });
        
        // In a real application, send SMS with OTP code
        console.log(`Phone verification OTP for ${req.user?.phone}: ${otpCode}`);
      }
      
      res.json({
        status: 'Success',
        message: 'Identity verification submitted successfully',
        data: { verificationId: identityVerification.id }
      });
      
    } catch (error) {
      console.error('Identity verification error:', error);
      res.status(500).json({
        status: 'Error',
        message: 'Failed to submit identity verification'
      });
    }
  }
];

export const getVerificationStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const identityVerification = await storage.getIdentityVerificationByUserId(parseInt(userId));
    const driverVerification = await storage.getDriverVerificationByUserId(parseInt(userId));
    
    res.json({
      status: 'Success',
      data: {
        identity: identityVerification,
        driver: driverVerification
      }
    });
    
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      status: 'Error',
      message: 'Failed to get verification status'
    });
  }
};

const verifyOTPSchema = z.object({
  userId: z.coerce.number().positive(),
  otpCode: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits')
});

export const verifyPhoneOTP = [
  sanitizeInput(),
  validateSchema(verifyOTPSchema),
  async (req: Request, res: Response) => {
    try {
      const { userId, otpCode } = req.body;
    
      const phoneVerification = await storage.verifyPhoneOTP(parseInt(userId), otpCode);
    
      if (phoneVerification) {
        // Update user phone verification status
        await storage.updateUser(parseInt(userId), { isPhoneVerified: true });
        
        res.json({
          status: 'Success',
          message: 'Phone number verified successfully'
        });
      } else {
        res.status(400).json({
          status: 'Error',
          message: 'Invalid or expired OTP code'
        });
      }
    
    } catch (error) {
      console.error('Phone OTP verification error:', error);
      res.status(500).json({
        status: 'Error',
        message: 'Failed to verify phone number'
      });
    }
  }
];

// Export router with routes
import { Router } from 'express';
const router = Router();

router.post('/identity-verification', submitIdentityVerification);
router.get('/status/:userId', getVerificationStatus);
router.post('/verify-phone-otp', verifyPhoneOTP);

export default router;