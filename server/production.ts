import dotenv from 'dotenv';

// Load environment variables - prioritize system environment (for cloud platforms)
dotenv.config({ path: '.env', override: false });

import express, { Express, Request, Response } from "express";
import cors from "cors";
import { Pool } from 'pg';

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        process.env.FRONTEND_URL,
        process.env.CLIENT_URL,
        "https://*.vercel.app"
      ].filter(Boolean)
    : ["http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection for production
const DATABASE_URL = process.env.DATABASE_URL;
let pool: Pool | null = null;

if (DATABASE_URL) {
  pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({
        status: 'unhealthy',
        database: 'not_configured',
        message: 'DATABASE_URL not provided'
      });
    }

    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    
    res.json({
      status: 'healthy',
      database: 'connected',
      server_time: new Date().toISOString(),
      db_time: result.rows[0].current_time,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'BrillPrime Backend API - Production Ready!', 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    platform: process.env.VERCEL ? 'Vercel' : 'Development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'BrillPrime API Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: [
      'GET /api/test - Basic server test',
      'GET /api/health - Health check with database test',
      'GET / - This information'
    ]
  });
});

// For Vercel serverless functions
export default app;

// For local development only
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 BrillPrime server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Database: ${DATABASE_URL ? 'Connected' : 'Not configured'}`);
  });
}