
import { dbOperations } from './db.js';
import bcrypt from 'bcryptjs';

export const storage = {
  // User operations
  async createUser(userData: any) {
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    return await dbOperations.createUser(userData);
  },

  async getUserByEmail(email: string) {
    return await dbOperations.getUserByEmail(email);
  },

  async getUserById(id: number) {
    return await dbOperations.getUserById(id);
  },

  async updateUser(userId: number, data: any) {
    return await dbOperations.updateUser(userId, data);
  },

  async verifyPassword(password: string, hashedPassword: string) {
    return await bcrypt.compare(password, hashedPassword);
  },

  // Identity verification
  async createIdentityVerification(data: any) {
    return await dbOperations.createIdentityVerification(data);
  },
  
  async getIdentityVerificationByUserId(userId: number) {
    return await dbOperations.getIdentityVerificationByUserId(userId);
  },

  async updateIdentityVerificationStatus(verificationId: number, status: string, reviewedBy?: number, rejectionReason?: string) {
    return await dbOperations.updateIdentityVerificationStatus(verificationId, status, reviewedBy, rejectionReason);
  },
  
  // Driver verification (using identity verification)
  async createDriverVerification(data: any) {
    return await dbOperations.createIdentityVerification({
      ...data,
      documentType: 'DRIVER_LICENSE'
    });
  },
  
  async getDriverVerificationByUserId(userId: number) {
    return await dbOperations.getIdentityVerificationByUserId(userId);
  },
  
  // Phone verification (simplified - in production you'd have a separate table)
  async createPhoneVerification(data: any) {
    // For now, just update user's phone verification status
    return await dbOperations.updateUser(data.userId, { isVerified: false });
  },
  
  async verifyPhoneOTP(userId: number, otpCode: string) {
    // In production, you'd verify against stored OTP
    // For now, accept any 6-digit code and mark user as verified
    if (otpCode.length === 6) {
      await dbOperations.updateUser(userId, { isVerified: true });
      return true;
    }
    return false;
  },

  // Order operations
  async createOrder(orderData: any) {
    return await dbOperations.createOrder(orderData);
  },

  async getOrdersByUserId(userId: number, role: string) {
    return await dbOperations.getOrdersByUserId(userId, role);
  },

  async updateOrderStatus(orderId: number, status: string) {
    return await dbOperations.updateOrderStatus(orderId, status);
  },

  // Transaction operations
  async createTransaction(transactionData: any) {
    return await dbOperations.createTransaction(transactionData);
  },

  async getTransactionsByUserId(userId: number) {
    return await dbOperations.getTransactionsByUserId(userId);
  },

  // Notification operations
  async createNotification(notificationData: any) {
    return await dbOperations.createNotification(notificationData);
  },

  async getNotificationsByUserId(userId: number) {
    return await dbOperations.getNotificationsByUserId(userId);
  },

  async markNotificationAsRead(notificationId: number) {
    return await dbOperations.markNotificationAsRead(notificationId);
  }
};
