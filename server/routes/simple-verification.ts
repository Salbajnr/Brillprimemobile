import { Request, Response } from "express";

import { db } from "../db";
import { identityVerifications, users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const submitIdentityVerification = async (req: Request, res: Response) => {
  try {
    const { userId, role, documentType, documentUrl, additionalData } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({
        status: 'Error',
        message: 'User ID and role are required'
      });
    }

    // Verify user exists
    const user = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        status: 'Error',
        message: 'User not found'
      });
    }

    // Create verification record
    const verificationId = nanoid();
    const verificationData = {
      userId: parseInt(userId),
      verificationType: role === 'DRIVER' ? 'DRIVER_LICENSE' : 'IDENTITY_CARD',
      documentUrl: documentUrl || null,
      status: 'PENDING',
      submittedAt: new Date(),
      additionalData: additionalData ? JSON.stringify(additionalData) : null
    };

    await db.insert(identityVerifications).values(verificationData);
    
    console.log(`Identity verification submitted for user ${userId} with role ${role}`);
    
    res.json({
      status: 'Success',
      message: 'Identity verification submitted successfully',
      data: { verificationId }
    });
    
  } catch (error) {
    console.error('Identity verification error:', error);
    res.status(500).json({
      status: 'Error',
      message: 'Failed to submit identity verification'
    });
  }
};