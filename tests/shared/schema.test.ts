import { insertUserSchema, signInSchema, otpVerificationSchema } from '../../shared/schema';

describe('Schema Validation', () => {
  describe('insertUserSchema', () => {
    test('should validate correct user data', () => {
      const validUser = {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        password: 'password123',
        role: 'CONSUMER' as const
      };

      const result = insertUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    test('should reject invalid email', () => {
      const invalidUser = {
        fullName: 'John Doe',
        email: 'invalid-email',
        phone: '1234567890',
        password: 'password123',
        role: 'CONSUMER' as const
      };

      const result = insertUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    test('should reject missing required fields', () => {
      const incompleteUser = {
        fullName: 'John Doe',
        email: 'john@example.com'
        // Missing phone, password, role
      };

      const result = insertUserSchema.safeParse(incompleteUser);
      expect(result.success).toBe(false);
    });

    test('should reject invalid role', () => {
      const invalidUser = {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        password: 'password123',
        role: 'INVALID_ROLE'
      };

      const result = insertUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('signInSchema', () => {
    test('should validate correct sign-in data', () => {
      const validSignIn = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = signInSchema.safeParse(validSignIn);
      expect(result.success).toBe(true);
    });

    test('should reject invalid email format', () => {
      const invalidSignIn = {
        email: 'not-an-email',
        password: 'password123'
      };

      const result = signInSchema.safeParse(invalidSignIn);
      expect(result.success).toBe(false);
    });

    test('should reject empty password', () => {
      const invalidSignIn = {
        email: 'test@example.com',
        password: ''
      };

      const result = signInSchema.safeParse(invalidSignIn);
      expect(result.success).toBe(false);
    });
  });

  describe('otpVerificationSchema', () => {
    test('should validate correct OTP data', () => {
      const validOtp = {
        email: 'test@example.com',
        otp: '123456'
      };

      const result = otpVerificationSchema.safeParse(validOtp);
      expect(result.success).toBe(true);
    });

    test('should reject OTP with wrong length', () => {
      const invalidOtp = {
        email: 'test@example.com',
        otp: '12345' // Should be 6 digits
      };

      const result = otpVerificationSchema.safeParse(invalidOtp);
      expect(result.success).toBe(false);
    });

    test('should reject invalid email in OTP verification', () => {
      const invalidOtp = {
        email: 'invalid-email',
        otp: '123456'
      };

      const result = otpVerificationSchema.safeParse(invalidOtp);
      expect(result.success).toBe(false);
    });
  });
});