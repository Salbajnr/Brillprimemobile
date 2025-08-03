const request = require('supertest');
const app = require('../server');

// Mock data for POST requests
const adminId = 'admin123';

describe('Admin Panel API', () => {
    it('GET / should return running message', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('Admin Panel Backend Running');
    });

    it('GET /api/users should return users array', async () => {
        const res = await request(app).get('/api/users');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/verification/:id/approve should approve verification', async () => {
        const res = await request(app).post('/api/verification/testid/approve');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('POST /api/verification/:id/reject should reject verification', async () => {
        const res = await request(app).post('/api/verification/testid/reject');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('POST /api/users/:id/switch-type should switch account type', async () => {
        const res = await request(app)
            .post('/api/users/testid/switch-type')
            .send({ newType: 'merchant' });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('GET /api/support-tickets should return tickets array', async () => {
        const res = await request(app).get('/api/support-tickets');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/support-tickets/:id/status should update ticket status', async () => {
        const res = await request(app)
            .post('/api/support-tickets/testid/status')
            .send({ status: 'closed' });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('POST /api/support-tickets/:id/respond should respond to ticket', async () => {
        const res = await request(app)
            .post('/api/support-tickets/testid/respond')
            .send({ response: 'Test response', adminId });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('GET /api/reports should return reports array', async () => {
        const res = await request(app).get('/api/reports');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/reports/:id/respond should respond to report', async () => {
        const res = await request(app)
            .post('/api/reports/testid/respond')
            .send({ response: 'Test report response', adminId });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('GET /api/metrics should return metrics object', async () => {
        const res = await request(app).get('/api/metrics');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('userCount');
        expect(res.body).toHaveProperty('activePayments');
        expect(res.body).toHaveProperty('ticketCount');
    });

    it('GET /api/payments should return payments array', async () => {
        const res = await request(app).get('/api/payments');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/payments/:id/status should update payment status', async () => {
        const res = await request(app)
            .post('/api/payments/testid/status')
            .send({ status: 'completed', adminId });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('POST /api/payments/:id/refund should refund payment', async () => {
        const res = await request(app)
            .post('/api/payments/testid/refund')
            .send({ adminId });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    // Moderation
    it('GET /api/content-reports should return content reports', async () => {
        const res = await request(app).get('/api/content-reports');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/content-reports/:id/respond should respond to content report', async () => {
        const res = await request(app)
            .post('/api/content-reports/testid/respond')
            .send({ response: 'Moderation response', adminId });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('GET /api/vendor-violations should return vendor violations', async () => {
        const res = await request(app).get('/api/vendor-violations');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    // Location & Service
    it('GET /api/driver-locations should return driver locations', async () => {
        const res = await request(app).get('/api/driver-locations');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/fuel-deliveries should return fuel deliveries', async () => {
        const res = await request(app).get('/api/fuel-deliveries');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    // Fraud
    it('GET /api/suspicious-transactions should return suspicious transactions', async () => {
        const res = await request(app).get('/api/suspicious-transactions');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/suspicious-transactions/:id/flag should flag transaction', async () => {
        const res = await request(app)
            .post('/api/suspicious-transactions/testid/flag');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    // Compliance
    it('GET /api/compliance-documents should return compliance documents', async () => {
        const res = await request(app).get('/api/compliance-documents');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/compliance-documents/:id/review should update compliance status', async () => {
        const res = await request(app)
            .post('/api/compliance-documents/testid/review')
            .send({ status: 'approved' });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});