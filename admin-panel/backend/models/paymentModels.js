const mongoose = require('mongoose');

const livePaymentSchema = new mongoose.Schema({
    userId: String,
    amount: Number,
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date
});

const deliveryConfirmationSchema = new mongoose.Schema({
    paymentId: String,
    qrCode: String,
    scanned: { type: Boolean, default: false },
    scannedAt: Date
});

const paymentDistributionSchema = new mongoose.Schema({
    paymentId: String,
    recipientId: String,
    amount: Number,
    distributedAt: Date
});

const escrowAccountSchema = new mongoose.Schema({
    balance: Number,
    lastUpdated: Date
});

const adminPaymentActionSchema = new mongoose.Schema({
    adminId: String,
    action: String,
    paymentId: String,
    timestamp: { type: Date, default: Date.now },
    details: Object
});

module.exports = {
    LivePayment: mongoose.model('LivePayment', livePaymentSchema),
    DeliveryConfirmation: mongoose.model('DeliveryConfirmation', deliveryConfirmationSchema),
    PaymentDistribution: mongoose.model('PaymentDistribution', paymentDistributionSchema),
    EscrowAccount: mongoose.model('EscrowAccount', escrowAccountSchema),
    AdminPaymentAction: mongoose.model('AdminPaymentAction', adminPaymentActionSchema)
};
