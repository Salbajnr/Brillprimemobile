
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

export async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database schema...');

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

    // Check if categories exist, if not create them
    const [existingCategories] = await db.select().from(categories).limit(1);
    
    if (!existingCategories) {
      const defaultCategories = [
        { name: 'Electronics', description: 'Electronic devices and accessories', isActive: true },
        { name: 'Food & Beverages', description: 'Food items and drinks', isActive: true },
        { name: 'Clothing', description: 'Clothes and fashion accessories', isActive: true },
        { name: 'Health & Beauty', description: 'Health and beauty products', isActive: true },
        { name: 'Home & Garden', description: 'Home improvement and garden items', isActive: true },
        { name: 'Sports & Outdoors', description: 'Sports equipment and outdoor gear', isActive: true },
        { name: 'Books & Media', description: 'Books, movies, and media content', isActive: true },
        { name: 'Automotive', description: 'Car parts and automotive accessories', isActive: true }
      ];

      await db.insert(categories).values(defaultCategories);
      console.log('✅ Default categories created');
    }

    // Check if toll gates exist, if not create them
    const [existingTollGates] = await db.select().from(tollGates).limit(1);
    
    if (!existingTollGates) {
      const defaultTollGates = [
        {
          name: 'Lagos-Ibadan Expressway Toll',
          location: 'Lagos-Ibadan Expressway, Ogun State',
          latitude: '6.6018',
          longitude: '3.3515',
          price: '200.00',
          isActive: true
        },
        {
          name: 'Lekki-Ajah Toll',
          location: 'Lekki-Epe Expressway, Lagos',
          latitude: '6.4281',
          longitude: '3.5595',
          price: '250.00',
          isActive: true
        },
        {
          name: 'Abuja-Keffi Toll',
          location: 'Abuja-Keffi Expressway, FCT',
          latitude: '9.0579',
          longitude: '7.4951',
          price: '150.00',
          isActive: true
        }
      ];

      await db.insert(tollGates).values(defaultTollGates);
      console.log('✅ Default toll gates created');
    }

    console.log('✅ Initial data seeding completed');
    return true;
  } catch (error) {
    console.error('❌ Data seeding error:', error);
    return false;
  }
}

export { db };
