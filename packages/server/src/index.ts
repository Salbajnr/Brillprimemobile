
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes and middleware from the existing server directory
import { registerRoutes } from '../../../server/routes.js';
import { setupWebSocket } from '../../../server/websocket.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'development' ? 
      ["http://localhost:5173", "http://localhost:3000", "http://0.0.0.0:5173"] : 
      true,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? 
    ["http://localhost:5173", "http://localhost:3000", "http://0.0.0.0:5173"] : 
    true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from web app
app.use(express.static(path.join(__dirname, '../../../apps/web/dist')));

// Register API routes
registerRoutes(app);

// Setup WebSocket
setupWebSocket(io);

// Catch-all handler for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../apps/web/dist/index.html'));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, '../../../apps/web/dist')}`);
});

export { app, server, io };
