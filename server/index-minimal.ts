import dotenv from 'dotenv';
dotenv.config({ path: '.env', override: false });

import express from "express";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting BrillPrime minimal server...');

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        "https://www.brillprime.com",
        "https://brillprime.com",
        "https://brillprime-backend.replit.app",
        "https://*.replit.app",
        "https://*.replit.dev"
      ]
    : ["http://localhost:3000", "http://localhost:5173", "http://0.0.0.0:5000"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple test routes
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'BrillPrime API working!', 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  console.log('✅ Serving built client files from dist/');
}

// SPA fallback - using a more specific pattern to avoid issues
app.use((req, res, next) => {
  // Handle API routes not found
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  
  // Serve SPA for all other requests
  const clientIndexPath = path.join(__dirname, '../client/dist/index.html');
  res.sendFile(clientIndexPath, (err) => {
    if (err) {
      console.error('Error serving client index.html:', err);
      res.status(500).send('Error loading client application');
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ BrillPrime minimal server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Server ready!`);
});