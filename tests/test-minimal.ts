import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting minimal test server...');

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Import one route at a time to test
import healthCheckRoutes from './routes/health-check';
import authRoutes from './routes/auth';
import systemHealthRoutes from './routes/system-health';
import mfaAuthenticationRoutes from './routes/mfa-authentication';
import enhancedVerificationRoutes from './routes/enhanced-verification';
import databaseMonitoringRoutes from './routes/database-monitoring';
import autoAssignmentRoutes from './routes/auto-assignment';
import deliveryFeedbackRoutes from './routes/delivery-feedback';
import adminRoutes from './admin/routes';

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test server working!' });
});

// Test health check route
app.use('/api/health', healthCheckRoutes);

// Test auth route
app.use('/api/auth', authRoutes);

// Test system health route
app.use('/api/system-health', systemHealthRoutes);

// Test MFA route
app.use('/api/mfa', mfaAuthenticationRoutes);

// Test enhanced verification route
app.use('/api/enhanced-verification', enhancedVerificationRoutes);

// Test database monitoring route
app.use('/api/database', databaseMonitoringRoutes);

// Test auto-assignment route
app.use('/api/auto-assignment', autoAssignmentRoutes);

// Test delivery feedback route
app.use('/api/delivery-feedback', deliveryFeedbackRoutes);

// Test admin routes
app.use('/api/admin', (req, res, next) => {
  if (req.subdomain !== 'admin') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
}, adminRoutes);

// Serve static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  console.log('✅ Serving built client files from dist/');
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
});