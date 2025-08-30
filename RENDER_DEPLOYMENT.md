
# BrillPrime Backend Deployment Guide (Render)

## Backend-Only Deployment on Render

This guide covers deploying **only the backend** to Render, as part of the separate frontend/backend architecture.

### Architecture Overview
- **Backend**: Deployed on Render (API server only)
- **Frontend**: Deployed separately on Replit (Static)
- **Database**: Render PostgreSQL (managed service)
- **Communication**: Frontend connects to backend via HTTPS API

### Quick Deployment Steps

#### 1. Prepare Backend for Render
```bash
# Ensure backend can run independently
cd server
npm install
npm run dev  # Test locally
```

#### 2. Push to GitHub
```bash
git add .
git commit -m "Prepare backend for Render deployment"
git push origin main
```

#### 3. Connect to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure deployment settings:

```yaml
# render.yaml (backend only)
services:
  - type: web
    name: brillprime-backend
    env: node
    plan: starter
    buildCommand: npm install
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    domains:
      - brillprime-backend.onrender.com
```

#### 4. Environment Variables
Configure these in Render dashboard:

**Database:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
```

**Security:**
```env
JWT_SECRET=your-64-character-secret-key
SESSION_SECRET=your-64-character-session-key
```

**Payments:**
```env
PAYSTACK_SECRET_KEY=sk_live_your_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_public_key
```

**CORS (for frontend):**
```env
FRONTEND_URL=https://your-frontend-repl.replit.app
CORS_ORIGIN=https://your-frontend-repl.replit.app
```

#### 5. Database Setup
Render will automatically connect to your PostgreSQL service:
```env
DATABASE_URL=postgresql://brillprimemobiledb_user:password@host/brillprimemobiledb
```

### Backend-Only Configuration

#### Package.json Scripts
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "tsx watch server/index.ts",
    "migrate": "node dist/migrations/run.js"
  }
}
```

#### Server Configuration (server/index.ts)
```typescript
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 10000;

// CORS for frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-frontend.replit.app',
  credentials: true
}));

// API routes only (no static file serving)
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
// ... other API routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

### API Endpoints (Backend Only)

#### Authentication Endpoints
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/validate-session
POST /api/auth/mfa/setup
```

#### Order Management
```
GET  /api/orders
POST /api/orders
PUT  /api/orders/:id/status
GET  /api/tracking/:id
```

#### Payment Processing
```
GET  /api/wallet/balance
POST /api/wallet/fund
POST /api/payments/transfer
POST /api/payments/toll
```

#### Real-time Features
```
WebSocket: wss://brillprime-backend.onrender.com
Events: order_updates, chat_messages, driver_location
```

### Deployment Process

#### Build Process
1. **Install Dependencies**: `npm install`
2. **TypeScript Compilation**: `tsc` (if needed)
3. **Database Migration**: Automatic on startup
4. **Server Start**: `npm run start`

#### Monitoring
- **Logs**: Available in Render dashboard
- **Metrics**: CPU, memory, response times
- **Health Check**: `/health` endpoint
- **Database**: Monitor via Render PostgreSQL dashboard

### Frontend Integration

#### API Configuration
Frontend connects to backend via:
```typescript
// Frontend configuration
const API_BASE_URL = 'https://brillprime-backend.onrender.com/api';
const WEBSOCKET_URL = 'wss://brillprime-backend.onrender.com';
```

#### CORS Setup
Backend allows requests from frontend domain:
```typescript
app.use(cors({
  origin: ['https://your-frontend.replit.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Performance Optimizations

#### Backend Optimizations
- **Database Connection Pooling**: Efficient PostgreSQL connections
- **Request Caching**: Redis caching for frequently accessed data
- **API Rate Limiting**: Prevent abuse and improve performance
- **Compression**: Gzip compression for API responses

#### Database Optimizations
- **Query Optimization**: Indexed columns for faster queries
- **Connection Limits**: Proper connection pool sizing
- **Read Replicas**: For high-traffic read operations (if needed)

### Security Features

#### API Security
- **JWT Authentication**: Secure token-based authentication
- **Session Management**: Secure session handling
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protect against DDoS attacks

#### Data Protection
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization
- **CSRF Protection**: Cross-site request forgery prevention
- **Encryption**: TLS 1.3 for all communications

### Monitoring & Alerts

#### Health Monitoring
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.raw('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

#### Performance Metrics
- **Response Time**: Track API response times
- **Error Rate**: Monitor 4xx and 5xx responses
- **Database Performance**: Query execution times
- **Memory Usage**: Monitor memory consumption

### Scaling Considerations

#### Horizontal Scaling
- **Multiple Instances**: Render can auto-scale based on traffic
- **Load Balancing**: Automatic load distribution
- **Session Storage**: Use Redis for shared session storage

#### Database Scaling
- **Connection Pooling**: Optimize database connections
- **Query Optimization**: Index critical columns
- **Read Replicas**: Separate read/write operations

### Troubleshooting

#### Common Issues
1. **Database Connection**: Check DATABASE_URL and firewall
2. **CORS Errors**: Verify FRONTEND_URL and CORS_ORIGIN
3. **Environment Variables**: Ensure all required vars are set
4. **Port Configuration**: Use PORT=10000 for Render

#### Debug Commands
```bash
# Check logs
render logs --service brillprime-backend

# Test API endpoints
curl https://brillprime-backend.onrender.com/health
curl https://brillprime-backend.onrender.com/api/auth/validate-session
```

### Custom Domain (Optional)

#### Setup Steps
1. Go to Render dashboard → Service Settings
2. Add custom domain: `api.brillprime.com`
3. Configure DNS records:
   ```
   CNAME api brillprime-backend.onrender.com
   ```
4. Update frontend API_BASE_URL to use custom domain

### Benefits of Backend-Only Deployment

#### 1. **Focused Resources**
- All server resources dedicated to API processing
- No static file serving overhead
- Optimized for database and business logic

#### 2. **Better Performance**
- Faster API response times
- Dedicated WebSocket handling
- Optimized database connections

#### 3. **Easier Scaling**
- Scale based on API traffic
- Independent of frontend deployment
- Better resource utilization

#### 4. **Simplified Maintenance**
- Backend-focused monitoring
- Clearer error tracking
- Dedicated backend updates

Your BrillPrime backend is now optimally deployed on Render with dedicated API processing! 🚀

### Access URLs
- **API Base**: `https://brillprime-backend.onrender.com/api`
- **WebSocket**: `wss://brillprime-backend.onrender.com`
- **Health Check**: `https://brillprime-backend.onrender.com/health`
- **Admin Panel**: `https://brillprime-backend.onrender.com/admin` (if enabled)
