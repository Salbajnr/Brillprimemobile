import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes WITHOUT database dependencies first
// import healthCheckRoutes from './routes/health-check';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting test server without database imports...');

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple test route without any database imports
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test server working without database!' });
});

// Now try importing health check which might have database imports
try {
  console.log('Importing health check route...');
  const healthCheckRoutes = await import('./routes/health-check');
  app.use('/api/health', healthCheckRoutes.default);
  console.log('✅ Health check route imported successfully');
} catch (error) {
  console.error('❌ Error importing health check route:', error);
}

// Serve static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  console.log('✅ Serving built client files from dist/');
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Test server running on port ${PORT}`);
});