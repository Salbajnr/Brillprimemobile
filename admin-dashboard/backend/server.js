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
        action: status,
        paymentId: req.params.id,
        details: req.body.details || {}
    });
    res.json({ success: true });
});

// Refund payment
app.post('/api/payments/:id/refund', async (req, res) => {
    const { adminId, reason } = req.body;
    await LivePayment.findByIdAndUpdate(req.params.id, { status: 'refunded' });
    await AdminPaymentAction.create({
        adminId,
        action: 'refund',
        paymentId: req.params.id,
        details: { reason }
    });
    res.json({ success: true });
});

// --- Moderation Management ---
const { ContentReport, VendorViolation } = require('./models/moderationModels');

// Get all content reports
app.get('/api/content-reports', async (req, res) => {
    const reports = await ContentReport.find();
    res.json(reports);
});

// Get all vendor violations
app.get('/api/vendor-violations', async (req, res) => {
    const violations = await VendorViolation.find();
    res.json(violations);
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

// --- Location & Service Management ---
const { DriverLocation, FuelDelivery } = require('./models/locationModels');

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

// Update delivery status
app.post('/api/fuel-deliveries/:id/status', async (req, res) => {
    const { status } = req.body;
    const updateData = { status };
    if (status === 'completed') {
        updateData.completedAt = new Date();
    }
    await FuelDelivery.findByIdAndUpdate(req.params.id, updateData);
    res.json({ success: true });
});

// --- Fraud Detection ---
const { SuspiciousTransaction } = require('./models/fraudModels');

// Get all suspicious transactions
app.get('/api/suspicious-transactions', async (req, res) => {
    const transactions = await SuspiciousTransaction.find();
    res.json(transactions);
});

// Flag/unflag transaction
app.post('/api/suspicious-transactions/:id/flag', async (req, res) => {
    const { flagged } = req.body;
    await SuspiciousTransaction.findByIdAndUpdate(req.params.id, { flagged });
    res.json({ success: true });
});

// --- Compliance Management ---
const { ComplianceDocument } = require('./models/complianceModels');

// Get all compliance documents
app.get('/api/compliance-documents', async (req, res) => {
    const documents = await ComplianceDocument.find();
    res.json(documents);
});

// Approve/reject compliance document
app.post('/api/compliance-documents/:id/review', async (req, res) => {
    const { status } = req.body;
    await ComplianceDocument.findByIdAndUpdate(
        req.params.id,
        { status, reviewedAt: new Date() }
    );
    res.json({ success: true });
});

// --- Real-time Communication ---
io.on('connection', (socket) => {
    console.log('Admin connected');
    
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
    
    socket.on('disconnect', () => {
        console.log('Admin disconnected');
    });
});

const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
    console.log(`Admin Panel Backend running on port ${PORT}`);
});