import { users, otpCodes, type User, type InsertUser, type OtpCode, type InsertOtpCode } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUser(email: string): Promise<void>;
  createOtpCode(otpCode: InsertOtpCode): Promise<OtpCode>;
  getOtpCode(email: string, code: string): Promise<OtpCode | undefined>;
  markOtpAsUsed(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private otpCodes: Map<number, OtpCode>;
  private currentUserId: number;
  private currentOtpId: number;

  constructor() {
    this.users = new Map();
    this.otpCodes = new Map();
    this.currentUserId = 1;
    this.currentOtpId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      isVerified: false,
      profilePicture: null,
      address: null,
      city: null,
      state: null,
      country: "Nigeria",
      bio: null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async verifyUser(email: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (user) {
      const updatedUser = { ...user, isVerified: true };
      this.users.set(user.id, updatedUser);
    }
  }

  async createOtpCode(insertOtpCode: InsertOtpCode): Promise<OtpCode> {
    const id = this.currentOtpId++;
    const otpCode: OtpCode = {
      ...insertOtpCode,
      id,
      isUsed: false,
      createdAt: new Date()
    };
    this.otpCodes.set(id, otpCode);
    return otpCode;
  }

  async getOtpCode(email: string, code: string): Promise<OtpCode | undefined> {
    return Array.from(this.otpCodes.values()).find(
      (otp) => otp.email === email && otp.code === code && !otp.isUsed && otp.expiresAt > new Date()
    );
  }

  async markOtpAsUsed(id: number): Promise<void> {
    const otpCode = this.otpCodes.get(id);
    if (otpCode) {
      const updatedOtpCode = { ...otpCode, isUsed: true };
      this.otpCodes.set(id, updatedOtpCode);
    }
  }
}

export const storage = new MemStorage();
