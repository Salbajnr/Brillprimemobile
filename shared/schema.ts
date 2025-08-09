import { z } from "zod";

// Basic user types
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  role: z.enum(["CONSUMER", "MERCHANT", "DRIVER", "ADMIN"]),
  isVerified: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
});

export type User = z.infer<typeof userSchema>;

// Transaction types
export const transactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string().default("NGN"),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "CANCELLED"]),
  type: z.enum(["PAYMENT", "REFUND", "WITHDRAWAL"]),
  userId: z.string(),
  merchantId: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
});

export type Transaction = z.infer<typeof transactionSchema>;

// Order types
export const orderSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  merchantId: z.string(),
  driverId: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "DELIVERED", "CANCELLED"]),
  amount: z.number(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    price: z.number(),
  })),
  deliveryAddress: z.string(),
  createdAt: z.date().default(() => new Date()),
});

export type Order = z.infer<typeof orderSchema>;