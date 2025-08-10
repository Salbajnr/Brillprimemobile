import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

const app = express();
const server = createServer(app);

// Basic middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true
  }
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BrillPrime server is running', timestamp: new Date().toISOString() });
});

// Basic auth endpoints (simplified)
app.post('/api/auth/signin', (req, res) => {
  res.json({ success: true, message: 'Sign in endpoint ready' });
});

app.post('/api/auth/signup', (req, res) => {
  res.json({ success: true, message: 'Sign up endpoint ready' });
});

app.get('/api/auth/session', (req, res) => {
  res.json({ user: null, authenticated: false });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BrillPrime server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for real-time connections`);
});

export default app;