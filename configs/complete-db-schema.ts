import { db } from "./db";
import { 
  users, 
  categories, 
  products, 
  orders, 
  wallets, 
  transactions, 
  driverProfiles, 
  merchantProfiles, 
  fuelOrders, 
  ratings, 
  notifications, 
  identityVerifications, 
  errorLogs, 
  mfaTokens, 
  verificationDocuments, 
  securityLogs, 
  trustedDevices, 
  supportTickets, 
  chatMessages, 
  tollGates, 
  suspiciousActivities, 
  fraudAlerts, 
  adminUsers, 
  complianceDocuments, 
  contentReports, 
  moderationResponses, 
  userLocations, 
  paymentMethods, 
  adminPaymentActions, 
  accountFlags, 
  conversations, 
  driverVerifications 
} from "../shared/schema";
import { sql } from 'drizzle-orm';

export async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database schema...');

    // Import and run the comprehensive table creation
    const { createAllMissingTables } = await import('./create-missing-tables');
    await createAllMissingTables();

    // Check if tables exist and create if needed
    const tableChecks = [
      { name: 'users', schema: users },
      { name: 'categories', schema: categories },
      { name: 'products', schema: products },
      { name: 'orders', schema: orders },
      { name: 'wallets', schema: wallets },
      { name: 'transactions', schema: transactions },
      { name: 'driver_profiles', schema: driverProfiles },
      { name: 'merchant_profiles', schema: merchantProfiles },
      { name: 'fuel_orders', schema: fuelOrders },
      { name: 'ratings', schema: ratings },
      { name: 'notifications', schema: notifications },
      { name: 'identity_verifications', schema: identityVerifications },
      { name: 'error_logs', schema: errorLogs },
      { name: 'mfa_tokens', schema: mfaTokens },
      { name: 'verification_documents', schema: verificationDocuments },
      { name: 'security_logs', schema: securityLogs },
      { name: 'trusted_devices', schema: trustedDevices },
      { name: 'support_tickets', schema: supportTickets },
      { name: 'chat_messages', schema: chatMessages },
      { name: 'toll_gates', schema: tollGates },
      { name: 'suspicious_activities', schema: suspiciousActivities },
      { name: 'fraud_alerts', schema: fraudAlerts },
      { name: 'admin_users', schema: adminUsers },
      { name: 'compliance_documents', schema: complianceDocuments },
      { name: 'content_reports', schema: contentReports },
      { name: 'moderation_responses', schema: moderationResponses },
      { name: 'user_locations', schema: userLocations },
      { name: 'payment_methods', schema: paymentMethods },
      { name: 'admin_payment_actions', schema: adminPaymentActions },
      { name: 'account_flags', schema: accountFlags },
      { name: 'conversations', schema: conversations },
      { name: 'driver_verifications', schema: driverVerifications }
    ];

    for (const table of tableChecks) {
      try {
        await db.select().from(table.schema).limit(1);
        console.log(`✅ Table ${table.name} exists`);
      } catch (error) {
        console.log(`⚠️  Table ${table.name} might not exist or has issues`);
      }
    }

    console.log('✅ Database schema check completed');
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return false;
  }
}

export async function seedInitialData() {
  try {
    console.log('🌱 Seeding initial data...');

    // Import and run the comprehensive seeding
    const { seedDefaultData } = await import('./create-missing-tables');
    await seedDefaultData();

    console.log('✅ Data seeding completed successfully');
  } catch (error) {
    console.log('⚠️ Data seeding skipped due to:', error.message);
    // Don't throw error, just log it
  }
}

export { db };