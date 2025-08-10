import { db } from './db';
import { 
  users, 
  products, 
  categories, 
  orders,
  transactions,
  merchantProfiles,
  driverProfiles,
  notifications,
  supportTickets
} from '../shared/schema';
import bcrypt from 'bcrypt';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create sample categories
    const sampleCategories = [
      { name: 'Fuel & Energy', description: 'Petrol, Diesel, Gas and Energy products', icon: 'fuel' },
      { name: 'Food & Beverages', description: 'Fresh food, snacks and drinks', icon: 'food' },
      { name: 'Electronics', description: 'Phones, computers and accessories', icon: 'electronics' },
      { name: 'Fashion', description: 'Clothing, shoes and accessories', icon: 'fashion' },
      { name: 'Home & Garden', description: 'Furniture, appliances and garden supplies', icon: 'home' }
    ];

    await db.insert(categories).values(sampleCategories).onConflictDoNothing();

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = {
      email: 'admin@brillprime.com',
      password: hashedPassword,
      fullName: 'System Administrator',
      phone: '+2348000000000',
      role: 'ADMIN' as const,
      isVerified: true,
      isActive: true
    };

    await db.insert(users).values(adminUser).onConflictDoNothing();

    // Create sample test users
    const testPassword = await bcrypt.hash('test123', 10);

    const testUsers = [
      {
        email: 'consumer@test.com',
        password: testPassword,
        fullName: 'John Consumer',
        phone: '+2348111111111',
        role: 'CONSUMER' as const,
        isVerified: true,
        isActive: true
      },
      {
        email: 'merchant@test.com',
        password: testPassword,
        fullName: 'Jane Merchant',
        phone: '+2348222222222',
        role: 'MERCHANT' as const,
        isVerified: true,
        isActive: true
      },
      {
        email: 'driver@test.com',
        password: testPassword,
        fullName: 'Mike Driver',
        phone: '+2348333333333',
        role: 'DRIVER' as const,
        isVerified: true,
        isActive: true
      }
    ];

    const createdUsers = await db.insert(users).values(testUsers).onConflictDoNothing().returning();

    // Create sample merchant profile
    if (createdUsers.length > 0) {
      const merchantUser = createdUsers.find(u => u.role === 'MERCHANT');
      if (merchantUser) {
        const merchantProfile = {
          userId: merchantUser.id,
          businessName: 'Lagos Fuel Station',
          businessAddress: '45 Allen Avenue, Ikeja, Lagos',
          businessType: 'FUEL_STATION',
          isOpen: true,
          rating: '4.7',
          totalOrders: 156,
          revenue: '2450000'
        };
        await db.insert(merchantProfiles).values(merchantProfile).onConflictDoNothing();
      }

      // Create sample driver profile
      const driverUser = createdUsers.find(u => u.role === 'DRIVER');
      if (driverUser) {
        const driverProfile = {
          userId: driverUser.id,
          vehicleType: 'Fuel Truck',
          vehicleModel: 'Isuzu NPR',
          plateNumber: 'LAG-123-ABC',
          licenseNumber: 'DL123456789',
          isAvailable: true,
          rating: '4.8',
          totalTrips: 156,
          earnings: '85500'
        };
        await db.insert(driverProfiles).values(driverProfile).onConflictDoNothing();
      }
    }

    // Create sample notifications for test users
    if (createdUsers.length > 0) {
      const consumerUser = createdUsers.find(u => u.role === 'CONSUMER');
      if (consumerUser) {
        const sampleNotifications = [
          {
            userId: consumerUser.id,
            title: 'Welcome to Brill Prime',
            message: 'Your account has been created successfully. Start exploring our services!',
            type: 'info',
            isRead: false
          },
          {
            userId: consumerUser.id,
            title: 'Fuel Order Delivered',
            message: 'Your fuel order #FO001 has been delivered successfully',
            type: 'success',
            isRead: true
          }
        ];
        await db.insert(notifications).values(sampleNotifications).onConflictDoNothing();
      }
    }

    // Create sample support ticket
    const sampleTicket = {
      ticketNumber: 'SP' + Date.now().toString().slice(-6),
      userId: createdUsers[0]?.id || 1,
      userRole: 'CONSUMER',
      name: 'John Consumer',
      email: 'consumer@test.com',
      subject: 'Fuel delivery delay',
      message: 'My fuel order has been delayed for over 2 hours. Please help resolve this issue.',
      status: 'OPEN',
      priority: 'HIGH'
    };

    await db.insert(supportTickets).values(sampleTicket).onConflictDoNothing();

    console.log('✅ Database seeded successfully!');
    console.log('Sample data includes:');
    console.log('- 5 product categories');
    console.log('- Admin user (admin@brillprime.com / admin123)');
    console.log('- Test users (consumer@test.com, merchant@test.com, driver@test.com / test123)');
    console.log('- Merchant and driver profiles');
    console.log('- Sample notifications');
    console.log('- Sample support ticket');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };