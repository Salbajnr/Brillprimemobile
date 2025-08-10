
import { Router } from 'express';
import { db } from '../db';
import { orders, users, merchantProfiles, tollGates } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// QR Code scanning endpoint
router.post('/scan', async (req, res) => {
  try {
    const { qrCode, type } = req.body;

    if (!qrCode || !type) {
      return res.status(400).json({
        success: false,
        message: 'QR code and type are required'
      });
    }

    let result;

    switch (type) {
      case 'delivery':
        result = await processDeliveryQR(qrCode);
        break;
      case 'payment':
        result = await processPaymentQR(qrCode);
        break;
      case 'merchant':
        result = await processMerchantQR(qrCode);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid QR code type'
        });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('QR processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process QR code'
    });
  }
});

async function processDeliveryQR(qrCode: string) {
  // Extract order ID from QR code
  const orderId = qrCode.replace('DELIVERY_', '');
  
  const [order] = await db.select()
    .from(orders)
    .where(eq(orders.id, parseInt(orderId)))
    .limit(1);

  if (!order) {
    throw new Error('Order not found');
  }

  // Get driver info if assigned
  let driverInfo = null;
  if (order.driverId) {
    const [driver] = await db.select()
      .from(users)
      .where(eq(users.id, order.driverId))
      .limit(1);
    driverInfo = driver;
  }

  return {
    orderId: order.orderNumber,
    driverName: driverInfo?.fullName || 'Not assigned',
    driverPhone: driverInfo?.phone || 'N/A',
    deliveryTime: order.createdAt.toLocaleString(),
    totalAmount: `₦${parseFloat(order.totalAmount).toLocaleString()}`,
    deliveryAddress: order.deliveryAddress,
    status: order.status,
    verified: true
  };
}

async function processPaymentQR(qrCode: string) {
  // Extract toll gate ID from QR code
  const tollGateId = qrCode.replace('PAYMENT_', '');
  
  const [tollGate] = await db.select()
    .from(tollGates)
    .where(eq(tollGates.qrCode, qrCode))
    .limit(1);

  if (!tollGate) {
    throw new Error('Invalid toll gate QR code');
  }

  return {
    tollGateName: tollGate.name,
    location: tollGate.location,
    amount: `₦${parseFloat(tollGate.tariff).toLocaleString()}`,
    reference: `PAY_${Date.now()}`,
    tollGateId: tollGate.id.toString()
  };
}

async function processMerchantQR(qrCode: string) {
  // Extract merchant ID from QR code
  const merchantId = qrCode.replace('MERCHANT_', '');
  
  const [merchant] = await db.select()
    .from(merchantProfiles)
    .innerJoin(users, eq(merchantProfiles.userId, users.id))
    .where(eq(merchantProfiles.id, parseInt(merchantId)))
    .limit(1);

  if (!merchant) {
    throw new Error('Merchant not found');
  }

  return {
    businessName: merchant.merchant_profiles.businessName,
    address: merchant.merchant_profiles.businessAddress,
    phone: merchant.users.phone,
    merchantId: merchant.merchant_profiles.id.toString(),
    rating: parseFloat(merchant.merchant_profiles.rating || '0'),
    isVerified: merchant.users.isVerified
  };
}

export default router;
