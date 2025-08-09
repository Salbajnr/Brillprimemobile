
import { pgTable, text, integer, timestamp, decimal, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { users } from "../db";

export const escrowTransactions = pgTable("escrow_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: text("order_id").notNull(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  merchantId: integer("merchant_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, PAID, RELEASED, DISPUTED, FAILED
  paymentMethod: text("payment_method").notNull(),
  paymentReference: text("payment_reference"),
  customerDetails: jsonb("customer_details"),
  escrowReleaseDate: timestamp("escrow_release_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
  releasedAt: timestamp("released_at"),
  disputeId: uuid("dispute_id"),
  failureReason: text("failure_reason"),
  notes: text("notes")
});

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").references(() => escrowTransactions.id).notNull(),
  filedBy: integer("filed_by").references(() => users.id).notNull(),
  disputeType: text("dispute_type").notNull(), // non_delivery, wrong_item, damaged_goods, service_issue
  description: text("description").notNull(),
  evidence: jsonb("evidence"),
  status: text("status").notNull().default("OPEN"), // OPEN, INVESTIGATING, RESOLVED, CLOSED
  resolution: text("resolution"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  filedAt: timestamp("filed_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at")
});

export const escrowReleases = pgTable("escrow_releases", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").references(() => escrowTransactions.id).notNull(),
  releaseType: text("release_type").notNull(), // automatic, customer_confirmation, manual_admin, dispute_resolution
  releasedBy: integer("released_by").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  releasedAt: timestamp("released_at").defaultNow().notNull()
});

export const deliveryConfirmations = pgTable("delivery_confirmations", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").references(() => escrowTransactions.id).notNull(),
  customerId: integer("customer_id").references(() => users.id).notNull(),
  rating: integer("rating"), // 1-5 stars
  feedback: text("feedback"),
  confirmedAt: timestamp("confirmed_at").defaultNow().notNull()
});

export const fraudAlerts = pgTable("fraud_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id),
  transactionId: uuid("transaction_id").references(() => escrowTransactions.id),
  alertType: text("alert_type").notNull(), // suspicious_payment, unusual_activity, velocity_check
  severity: text("severity").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  description: text("description").notNull(),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, INVESTIGATING, RESOLVED, FALSE_POSITIVE
  metadata: jsonb("metadata"),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id)
});
