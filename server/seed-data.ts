
import { storage } from './storage.js';
import { initializeDatabase } from './init-db.js';

async function seedDatabase() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    
    console.log('Seeding test data...');
    
    // Create test users
    const consumer = await storage.createUser({
      email: 'consumer@test.com',
      password: 'password123',
      fullName: 'Test Consumer',
      phone: '+2348012345678',
      role: 'CONSUMER'
    });

    const merchant = await storage.createUser({
      email: 'merchant@test.com',
      password: 'password123',
      fullName: 'Test Merchant',
      phone: '+2348012345679',
      role: 'MERCHANT'
    });

    const driver = await storage.createUser({
      email: 'driver@test.com',
      password: 'password123',
      fullName: 'Test Driver',
      phone: '+2348012345680',
      role: 'DRIVER'
    });

    const admin = await storage.createUser({
      email: 'admin@test.com',
      password: 'password123',
      fullName: 'Test Admin',
      phone: '+2348012345681',
      role: 'ADMIN'
    });

    // Create test orders
    const order1 = await storage.createOrder({
      customerId: consumer.id,
      merchantId: merchant.id,
      orderType: 'PRODUCT',
      totalAmount: '25.50',
      deliveryAddress: '123 Test Street, Lagos',
      status: 'PENDING',
      orderData: {
        items: [
          { name: 'Test Product', quantity: 2, price: 12.75 }
        ]
      }
    });

    const order2 = await storage.createOrder({
      customerId: consumer.id,
      orderType: 'FUEL',
      totalAmount: '50.00',
      deliveryAddress: '456 Test Avenue, Lagos',
      status: 'IN_PROGRESS',
      orderData: {
        fuelType: 'PMS',
        quantity: 20,
        location: { lat: 6.5244, lng: 3.3792 }
      }
    });

    // Create test transactions
    await storage.createTransaction({
      orderId: order1.id,
      userId: consumer.id,
      amount: '25.50',
      paymentMethod: 'CARD',
      paymentStatus: 'COMPLETED',
      paymentGatewayRef: 'paystack_ref_123'
    });

    // Create test notifications
    await storage.createNotification({
      userId: consumer.id,
      title: 'Order Confirmed',
      message: 'Your order has been confirmed and is being prepared.',
      type: 'ORDER'
    });

    await storage.createNotification({
      userId: merchant.id,
      title: 'New Order',
      message: 'You have received a new order.',
      type: 'ORDER'
    });

    console.log('Test data seeded successfully!');
    console.log('Test accounts created:');
    console.log('Consumer: consumer@test.com / password123');
    console.log('Merchant: merchant@test.com / password123');
    console.log('Driver: driver@test.com / password123');
    console.log('Admin: admin@test.com / password123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;
import { db, dbOperations } from './db';
import { users, products, categories } from '../shared/schema';
import bcrypt from 'bcrypt';

export async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create sample users
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Sample consumer
    const consumer = await dbOperations.createUser({
      email: 'consumer@test.com',
      password: hashedPassword,
      fullName: 'John Consumer',
      phone: '+234701234567',
      role: 'CONSUMER',
      isVerified: true,
      isActive: true
    });

    // Sample merchant
    const merchant = await dbOperations.createUser({
      email: 'merchant@test.com', 
      password: hashedPassword,
      fullName: 'Fresh Foods Ltd',
      phone: '+234701234568',
      role: 'MERCHANT',
      isVerified: true,
      isActive: true
    });

    // Sample driver
    const driver = await dbOperations.createUser({
      email: 'driver@test.com',
      password: hashedPassword, 
      fullName: 'Mike Driver',
      phone: '+234701234569',
      role: 'DRIVER',
      isVerified: true,
      isActive: true
    });

    console.log('✅ Sample users created');

    // Create sample products
    await db.insert(products).values([
      {
        name: 'Rice (50kg bag)',
        description: 'Premium quality rice from local farmers',
        price: '45000',
        unit: 'bag',
        categoryName: 'Grains',
        sellerId: merchant.id,
        images: [],
        rating: 4.5,
        reviewCount: 23,
        inStock: true,
        stockLevel: 50,
        isActive: true,
        lowStockThreshold: 10
      },
      {
        name: 'Palm Oil (5L)',
        description: 'Pure red palm oil',
        price: '8500',
        unit: 'bottle',
        categoryName: 'Oils',
        sellerId: merchant.id,
        images: [],
        rating: 4.2,
        reviewCount: 15,
        inStock: true,
        stockLevel: 30,
        isActive: true,
        lowStockThreshold: 5
      },
      {
        name: 'Beans (50kg bag)',
        description: 'Quality brown beans',
        price: '38000',
        unit: 'bag',
        categoryName: 'Grains',
        sellerId: merchant.id,
        images: [],
        rating: 4.0,
        reviewCount: 12,
        inStock: true,
        stockLevel: 25,
        isActive: true,
        lowStockThreshold: 8
      },
      {
        name: 'Tomatoes (Crate)',
        description: 'Fresh tomatoes',
        price: '15000',
        unit: 'crate',
        categoryName: 'Vegetables',
        sellerId: merchant.id,
        images: [],
        rating: 3.8,
        reviewCount: 8,
        inStock: true,
        stockLevel: 20,
        isActive: true,
        lowStockThreshold: 5
      }
    ]);

    console.log('✅ Sample products created');

    // Create a sample order
    const order = await dbOperations.createOrder({
      customerId: consumer.id,
      merchantId: merchant.id,
      orderType: 'PRODUCT',
      totalAmount: '53000',
      deliveryAddress: '123 Lagos Street, Ikeja, Lagos',
      orderData: {
        items: [
          { productId: 1, productName: 'Rice (50kg bag)', quantity: 1, price: 45000 },
          { productId: 2, productName: 'Palm Oil (5L)', quantity: 1, price: 8500 }
        ]
      },
      status: 'PENDING'
    });

    console.log('✅ Sample order created');

    // Create sample notifications
    await dbOperations.createNotification({
      userId: consumer.id,
      title: 'Welcome to Brill Prime!',
      message: 'Your account has been created successfully. Start ordering now!',
      type: 'SYSTEM',
      isRead: false
    });

    await dbOperations.createNotification({
      userId: merchant.id,
      title: 'New Order Received',
      message: `You have received a new order ${order.orderNumber}`,
      type: 'ORDER',
      isRead: false,
      metadata: { orderId: order.id }
    });

    console.log('✅ Sample notifications created');
    console.log('🌱 Database seeding completed successfully!');

    return {
      consumer,
      merchant,
      driver,
      order
    };

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
