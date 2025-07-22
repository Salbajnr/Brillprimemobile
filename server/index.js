import express from "express";
import { createServer } from "http";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'brillprime-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Basic API routes for testing
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Brillprime API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    server: 'Brillprime Development Server',
    status: 'Running',
    port: PORT,
    features: [
      'Authentication System',
      'Consumer Dashboard',
      'Merchant Dashboard', 
      'Driver Dashboard',
      'Admin Panel',
      'Payment Integration',
      'Live Chat System'
    ]
  });
});

// Serve static files in development
if (process.env.NODE_ENV !== 'production') {
  // Serve client assets
  app.use('/assets', express.static(path.join(__dirname, '../client/src/assets')));
  
  // Basic frontend route
  app.get('*', (req, res) => {
    // For development, return a basic HTML response
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Brillprime - Financial Services Platform</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px; 
              margin: 50px auto; 
              padding: 20px;
              background: linear-gradient(135deg, #4682b4, #0b1a51);
              color: white;
              min-height: 100vh;
            }
            .container { 
              background: rgba(255,255,255,0.1); 
              padding: 30px; 
              border-radius: 15px;
              backdrop-filter: blur(10px);
            }
            .logo { font-size: 2.5em; font-weight: bold; margin-bottom: 20px; }
            .status { color: #00ff88; font-weight: bold; }
            .features { margin: 20px 0; }
            .feature { 
              background: rgba(255,255,255,0.1); 
              margin: 10px 0; 
              padding: 15px; 
              border-radius: 8px;
              border-left: 4px solid #00ff88;
            }
            .endpoints { margin-top: 30px; }
            .endpoint { 
              background: rgba(0,0,0,0.3); 
              padding: 10px; 
              margin: 5px 0; 
              border-radius: 5px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Brillprime</div>
            <div class="status">✅ Server Status: Running Successfully</div>
            <div class="status">🚀 Port: ${PORT}</div>
            <div class="status">🌐 Environment: ${process.env.NODE_ENV || 'development'}</div>
            
            <div class="features">
              <h3>Available Features:</h3>
              <div class="feature">🔐 Authentication System (Sign Up/Sign In/OTP)</div>
              <div class="feature">👤 Consumer Dashboard & Wallet</div>
              <div class="feature">🏪 Merchant Dashboard & Orders</div>
              <div class="feature">🚛 Driver Dashboard & Deliveries</div>
              <div class="feature">⚙️ Admin Panel & Management</div>
              <div class="feature">💳 Payment Integration (Stripe/PayPal)</div>
              <div class="feature">💬 Real-time Chat System</div>
              <div class="feature">📱 Mobile-first PWA Design</div>
            </div>

            <div class="endpoints">
              <h3>Test Endpoints:</h3>
              <div class="endpoint">GET /api/health - Health check</div>
              <div class="endpoint">GET /api/status - Server status</div>
              <div class="endpoint">* - Frontend application (requires build)</div>
            </div>

            <div style="margin-top: 30px; padding: 20px; background: rgba(255,215,0,0.2); border-radius: 8px;">
              <h3>🛠️ Development Notes:</h3>
              <p>The TypeScript development environment is being set up. This server provides immediate access to test your Brillprime application while dependency conflicts are resolved.</p>
              <p><strong>Next Steps:</strong> Build the frontend assets to see the full React application with all your implemented features.</p>
            </div>
          </div>
        </body>
      </html>
    `);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Brillprime Development Server Started!');
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`🌐 Live preview available at: http://localhost:${PORT}`);
  console.log('🔧 Status: Ready for development and testing');
});

export default app;