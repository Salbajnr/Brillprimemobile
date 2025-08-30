import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const port = process.env.PORT || 5000;
const host = process.env.HOST || '0.0.0.0';

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Serve React app
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(parseInt(port.toString()), host, () => {
  console.log(`🚀 Simple server running on ${host}:${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database URL: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
});