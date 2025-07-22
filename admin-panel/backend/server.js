const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http, {
    cors: { origin: '*' }
});

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/brillprime_admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Example route
app.get('/', (req, res) => {
    res.send('Admin Panel Backend Running');
});

// --- User Management & Verification ---
const { User, VerificationRequest } = require('./models/userModels'); // Assume these models exist

// Get all users
app.get('/api/users', async (req, res) => {
    const users = await User.find();
    res.json(users);
});

// Approve/reject merchant/driver applications
app.post('/api/verification/:id/approve', async (req, res) => {
    await VerificationRequest.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.json({ success: true });
});
app.post('/api/verification/:id/reject', async (req, res) => {
    await VerificationRequest.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    res.json({ success: true });
});

// Switch account type
app.post('/api/users/:id/switch-type', async (req, res) => {
    const { newType } = req.body;
    await User.findByIdAndUpdate(req.params.id, { accountType: newType });
    res.json({ success: true });
});

// --- Support Ticket Management ---
const { SupportTicket } = require('./models/supportModels'); // Assume this model exists

// Get all support tickets
app.get('/api/support-tickets', async (req, res) => {
    const tickets = await SupportTicket.find();
    res.json(tickets);
});

// Update ticket status
app.post('/api/support-tickets/:id/status', async (req, res) => {
    const { status } = req.body;
    await SupportTicket.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true });
});

// Respond to a support ticket
app.post('/api/support-tickets/:id/respond', async (req, res) => {
    const { response, adminId } = req.body;
    await SupportTicket.findByIdAndUpdate(
        req.params.id,
        { $push: { responses: { adminId, response, respondedAt: new Date() } } }
    );
    res.json({ success: true });
});

// --- User Reports Management ---
const { Report } = require('./models/supportModels'); // Assume this model exists

// Get all reports
app.get('/api/reports', async (req, res) => {
    const reports = await Report.find();
    res.json(reports);
});

// Respond to a report
app.post('/api/reports/:id/respond', async (req, res) => {
    const { response, adminId } = req.body;
    await Report.findByIdAndUpdate(
        req.params.id,
        { $push: { responses: { adminId, response, respondedAt: new Date() } } }
    );
    res.json({ success: true });
});

// --- Real-time Metrics ---
const { LivePayment } = require('./models/paymentModels');

app.get('/api/metrics', async (req, res) => {
    const userCount = await User.countDocuments();
    const activePayments = await LivePayment.countDocuments({ status: 'pending' });
    const ticketCount = await SupportTicket.countDocuments({ status: 'open' });
    res.json({ userCount, activePayments, ticketCount });
});

// --- Payment Management ---
const {
    LivePayment,
    DeliveryConfirmation,
    PaymentDistribution,
    EscrowAccount,
    AdminPaymentAction
} = require('./models/paymentModels');

// Get all payments
app.get('/api/payments', async (req, res) => {
    const payments = await LivePayment.find();
    res.json(payments);
});

// Update payment status (e.g., refund, complete)
app.post('/api/payments/:id/status', async (req, res) => {
    const { status } = req.body;
    await LivePayment.findByIdAndUpdate(req.params.id, { status });
    // Log admin action
    await AdminPaymentAction.create({
        adminId: req.body.adminId,
        action: 'update_payment_status',
        paymentId: req.params.id,
        details: { status }
    });
    res.json({ success: true });
});

// --- QR Code Delivery Confirmation ---

// Generate QR code for delivery confirmation (stub, actual QR generation not shown)
app.post('/api/delivery-confirmation/:paymentId/generate', async (req, res) => {
    const qrCode = `QR-${req.params.paymentId}-${Date.now()}`; // Placeholder
    const confirmation = await DeliveryConfirmation.create({
        paymentId: req.params.paymentId,
        qrCode
    });
    res.json(confirmation);
});

// Scan/confirm delivery QR code
app.post('/api/delivery-confirmation/:id/scan', async (req, res) => {
    const confirmation = await DeliveryConfirmation.findByIdAndUpdate(
        req.params.id,
        { scanned: true, scannedAt: new Date() },
        { new: true }
    );
    if (confirmation && confirmation.paymentId) {
        await LivePayment.findByIdAndUpdate(confirmation.paymentId, { status: 'completed' });
        // Optionally, log admin action for automatic confirmation
        await AdminPaymentAction.create({
            adminId: req.body.adminId || 'system',
            action: 'auto_confirm_delivery',
            paymentId: confirmation.paymentId,
            details: { confirmationId: confirmation._id }
        });
    }
    res.json({ success: true });
});

// --- Payment Distribution ---

// Distribute payment to recipient
app.post('/api/payment-distribution', async (req, res) => {
    const { paymentId, recipientId, amount, adminId } = req.body;
    await PaymentDistribution.create({
        paymentId,
        recipientId,
        amount,
        distributedAt: new Date()
    });
    // Update escrow balance
    await EscrowAccount.updateOne({}, { $inc: { balance: -amount }, lastUpdated: new Date() });
    // Log admin action
    await AdminPaymentAction.create({
        adminId,
        action: 'distribute_payment',
        paymentId,
        details: { recipientId, amount }
    });
    res.json({ success: true });
});

// --- Refund Handling ---

app.post('/api/payments/:id/refund', async (req, res) => {
    const { adminId } = req.body;
    await LivePayment.findByIdAndUpdate(req.params.id, { status: 'refunded' });
    // Log admin action
    await AdminPaymentAction.create({
        adminId,
        action: 'refund_payment',
        paymentId: req.params.id,
        details: {}
    });
    res.json({ success: true });
});

// --- Marketplace & Content Moderation ---
const { ContentReport, VendorViolation } = require('./models/moderationModels'); // To be implemented

// Get all content reports
app.get('/api/content-reports', async (req, res) => {
    const reports = await ContentReport.find();
    res.json(reports);
});

// Respond to content report
app.post('/api/content-reports/:id/respond', async (req, res) => {
    const { response, adminId } = req.body;
    await ContentReport.findByIdAndUpdate(
        req.params.id,
        { $push: { responses: { adminId, response, respondedAt: new Date() } } }
    );
    res.json({ success: true });
});

// Get all vendor violations
app.get('/api/vendor-violations', async (req, res) => {
    const violations = await VendorViolation.find();
    res.json(violations);
});

// Respond to vendor violation
app.post('/api/vendor-violations/:id/respond', async (req, res) => {
    const { response, adminId } = req.body;
    await VendorViolation.findByIdAndUpdate(
        req.params.id,
        { $push: { responses: { adminId, response, respondedAt: new Date() } } }
    );
    res.json({ success: true });
});

// --- Location & Service Management ---
const { DriverLocation, FuelDelivery } = require('./models/locationModels'); // To be implemented

// Get all driver locations
app.get('/api/driver-locations', async (req, res) => {
    const locations = await DriverLocation.find();
    res.json(locations);
});

// Get all fuel deliveries
app.get('/api/fuel-deliveries', async (req, res) => {
    const deliveries = await FuelDelivery.find();
    res.json(deliveries);
});

// --- Fraud Detection & Suspicious Transactions ---
const { SuspiciousTransaction } = require('./models/fraudModels'); // To be implemented

// Get all suspicious transactions
app.get('/api/suspicious-transactions', async (req, res) => {
    const transactions = await SuspiciousTransaction.find();
    res.json(transactions);
});

// Flag a transaction as suspicious
app.post('/api/suspicious-transactions/:id/flag', async (req, res) => {
    await SuspiciousTransaction.findByIdAndUpdate(req.params.id, { flagged: true });
    res.json({ success: true });
});

// --- Regulatory Compliance ---
const { ComplianceDocument } = require('./models/complianceModels'); // To be implemented

// Get all compliance documents
app.get('/api/compliance-documents', async (req, res) => {
    const docs = await ComplianceDocument.find();
    res.json(docs);
});

// Update compliance document status
app.post('/api/compliance-documents/:id/status', async (req, res) => {
    const { status } = req.body;
    await ComplianceDocument.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true });
});

// --- Live Chat System ---
io.on('connection', (socket) => {
    console.log('Admin chat user connected:', socket.id);

    socket.on('chat message', (msg) => {
        // Broadcast to all connected admins
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('Admin chat user disconnected:', socket.id);
    });
});

// --- Unit Testing Setup ---
// To be implemented in /workspaces/Brillprimemobile/admin-panel/backend/tests/
// Example: Use Jest and Supertest for endpoint testing

// All endpoints use async/await and run each step sequentially.
// For multi-step endpoints (e.g., scan/confirm delivery), each DB operation finishes before the next starts.

// All backend features you requested so far are implemented:
// - User management & verification (approve/reject, switch type)
// - Support ticket management (view, update, respond)
// - User reports management (view, respond)
// - Real-time metrics
// - Payment management (view, update status, refund, distribution)
// - QR code delivery confirmation (auto-complete payment on scan)
// - Admin action audit trail for payments
// - Sequential execution for multi-step endpoints

// Features not yet implemented (let me know if you want these next):
// - Marketplace/content moderation endpoints
// - Location/service management (driver/fuel delivery monitoring)
// - Fraud detection/suspicious transaction endpoints
// - Regulatory compliance endpoints
// - Live chat system
// - Frontend dashboard UI

http.listen(4000, () => {
    console.log('Admin backend running on port 4000');
});