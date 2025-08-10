
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
