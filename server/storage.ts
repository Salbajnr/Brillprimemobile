
// Basic storage service for database operations
export const storage = {
  // Identity verification
  createIdentityVerification: async (data: any) => {
    return { id: Math.floor(Math.random() * 1000) };
  },
  
  getIdentityVerificationByUserId: async (userId: number) => {
    return { id: 1, userId, verificationStatus: 'PENDING' };
  },
  
  // Driver verification
  createDriverVerification: async (data: any) => {
    return { id: Math.floor(Math.random() * 1000) };
  },
  
  getDriverVerificationByUserId: async (userId: number) => {
    return { id: 1, userId, verificationStatus: 'PENDING' };
  },
  
  // Phone verification
  createPhoneVerification: async (data: any) => {
    return { id: Math.floor(Math.random() * 1000) };
  },
  
  verifyPhoneOTP: async (userId: number, otpCode: string) => {
    return otpCode === '123456'; // Mock verification
  },
  
  // User operations
  updateUser: async (userId: number, data: any) => {
    return { id: userId, ...data };
  }
};
