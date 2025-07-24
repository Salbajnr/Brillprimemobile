import { sql } from 'drizzle-orm';
import { pgTable, text, serial, integer, boolean, timestamp, decimal, uuid, json } from 'drizzle-orm/pg-core';

export async function up(db: any) {
  await db.schema
    .createTable('admin_users')
    .addColumn('id', serial('id').primaryKey())
    .addColumn('user_id', text('user_id').notNull().unique())
    .addColumn('role', text('role', { enum: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'MODERATOR'] }).notNull())
    .addColumn('permissions', json('permissions').notNull())
    .addColumn('created_at', timestamp('created_at').defaultNow())
    .addColumn('updated_at', timestamp('updated_at').defaultNow())
    .execute();

  await db.schema
    .createTable('admin_payment_actions')
    .addColumn('id', serial('id').primaryKey())
    .addColumn('admin_id', integer('admin_id').notNull().references('admin_users.id'))
    .addColumn('action', text('action', { enum: ['REFUND', 'HOLD', 'RELEASE', 'DISTRIBUTE'] }).notNull())
    .addColumn('payment_id', uuid('payment_id').notNull())
    .addColumn('details', json('details'))
    .addColumn('created_at', timestamp('created_at').defaultNow())
    .execute();

  await db.schema
    .createTable('delivery_confirmations')
    .addColumn('id', serial('id').primaryKey())
    .addColumn('order_id', uuid('order_id').notNull().references('orders.id'))
    .addColumn('qr_code', text('qr_code').notNull())
    .addColumn('scanned', boolean('scanned').default(false))
    .addColumn('scanned_at', timestamp('scanned_at'))
    .addColumn('created_at', timestamp('created_at').defaultNow())
    .execute();

  await db.schema
    .createTable('content_reports')
    .addColumn('id', serial('id').primaryKey())
    .addColumn('reported_by', integer('reported_by').notNull().references('users.id'))
    .addColumn('content_id', text('content_id').notNull())
    .addColumn('content_type', text('content_type', { enum: ['POST', 'COMMENT', 'PRODUCT', 'USER'] }).notNull())
    .addColumn('reason', text('reason').notNull())
    .addColumn('status', text('status', { enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'] }).default('PENDING'))
    .addColumn('created_at', timestamp('created_at').defaultNow())
    .addColumn('updated_at', timestamp('updated_at').defaultNow())
    .execute();

  await db.schema
    .createTable('moderation_responses')
    .addColumn('id', serial('id').primaryKey())
    .addColumn('report_id', integer('report_id').notNull().references('content_reports.id'))
    .addColumn('admin_id', integer('admin_id').notNull().references('admin_users.id'))
    .addColumn('response', text('response').notNull())
    .addColumn('action', text('action', { enum: ['WARNING', 'REMOVE', 'BAN', 'NO_ACTION'] }).notNull())
    .addColumn('created_at', timestamp('created_at').defaultNow())
    .execute();

  await db.schema
    .createTable('vendor_violations')
    .addColumn('id', serial('id').primaryKey())
    .addColumn('vendor_id', integer('vendor_id').notNull().references('users.id'))
    .addColumn('violation_type', text('violation_type', { 
      enum: ['POLICY_VIOLATION', 'QUALITY_ISSUE', 'DELIVERY_ISSUE', 'PAYMENT_ISSUE', 'CUSTOMER_COMPLAINT']
    }).notNull())
    .addColumn('description', text('description').notNull())
    .addColumn('status', text('status', { enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'] }).default('PENDING'))
    .addColumn('created_at', timestamp('created_at').defaultNow())
    .addColumn('updated_at', timestamp('updated_at').defaultNow())
    .execute();

  await db.schema
    .createTable('compliance_documents')
    .addColumn('id', serial('id').primaryKey())
    .addColumn('user_id', integer('user_id').notNull().references('users.id'))
    .addColumn('document_type', text('document_type', {
      enum: ['ID_CARD', 'BUSINESS_LICENSE', 'TAX_ID', 'VEHICLE_REGISTRATION', 'DRIVER_LICENSE', 'INSURANCE']
    }).notNull())
    .addColumn('document_url', text('document_url').notNull())
    .addColumn('status', text('status', { enum: ['PENDING', 'APPROVED', 'REJECTED'] }).default('PENDING'))
    .addColumn('reviewed_by', integer('reviewed_by').references('admin_users.id'))
    .addColumn('reviewed_at', timestamp('reviewed_at'))
    .addColumn('created_at', timestamp('created_at').defaultNow())
    .addColumn('updated_at', timestamp('updated_at').defaultNow())
    .execute();

  await db.schema
    .createTable('escrow_accounts')
    .addColumn('id', serial('id').primaryKey())
    .addColumn('balance', decimal('balance', { precision: 12, scale: 2 }).default('0'))
    .addColumn('last_updated', timestamp('last_updated').defaultNow())
    .addColumn('created_at', timestamp('created_at').defaultNow())
    .execute();

  await db.schema
    .createTable('payment_distributions')
    .addColumn('id', serial('id').primaryKey())
    .addColumn('payment_id', uuid('payment_id').notNull())
    .addColumn('recipient_id', integer('recipient_id').notNull().references('users.id'))
    .addColumn('amount', decimal('amount', { precision: 12, scale: 2 }).notNull())
    .addColumn('status', text('status', { enum: ['PENDING', 'COMPLETED', 'FAILED'] }).default('PENDING'))
    .addColumn('distributed_at', timestamp('distributed_at'))
    .addColumn('created_at', timestamp('created_at').defaultNow())
    .execute();
}

export async function down(db: any) {
  await db.schema.dropTable('payment_distributions').execute();
  await db.schema.dropTable('escrow_accounts').execute();
  await db.schema.dropTable('compliance_documents').execute();
  await db.schema.dropTable('vendor_violations').execute();
  await db.schema.dropTable('moderation_responses').execute();
  await db.schema.dropTable('content_reports').execute();
  await db.schema.dropTable('delivery_confirmations').execute();
  await db.schema.dropTable('admin_payment_actions').execute();
  await db.schema.dropTable('admin_users').execute();
}