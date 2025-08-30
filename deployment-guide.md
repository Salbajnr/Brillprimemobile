
# BrillPrime Deployment Guide

## Separate Frontend/Backend Deployment Architecture

This guide covers the new deployment strategy with separated frontend and backend services for optimal performance and scalability.

### Architecture Overview

#### Deployment Strategy
```
┌─────────────────┐    HTTPS/WSS    ┌─────────────────┐
│   Frontend      │ ◄──────────────► │    Backend      │
│   (Replit)      │                 │   (Replit)      │
│   Static Site   │                 │   API Server    │
└─────────────────┘                 └─────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │   Database      │
                                    │   (Render)      │
                                    │   PostgreSQL    │
                                    └─────────────────┘
```

#### Components
- **Frontend**: React SPA deployed as static files on Replit
- **Backend**: Node.js API server deployed on Replit
- **Database**: PostgreSQL managed by Render
- **Communication**: HTTPS API calls and WebSocket connections

## Prerequisites

### System Requirements
- Node.js 18+ 
- PostgreSQL 12+
- Git for version control
- Replit account for deployment

### Services Setup
- **Render Account**: For PostgreSQL database
- **Paystack Account**: For payment processing
- **Domain Name**: Optional for custom domains

## Environment Configuration

### Backend Environment Variables
```env
# Database Connection
DATABASE_URL=postgresql://user:pass@host:5432/brillprime

# Server Configuration
NODE_ENV=production
PORT=5000
REDIS_DISABLED=true

# Security
JWT_SECRET=your-64-character-random-string
SESSION_SECRET=your-64-character-random-string

# Payment Integration
PAYSTACK_SECRET_KEY=sk_live_your_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_public_key

# CORS Configuration
FRONTEND_URL=https://your-frontend-deployment-url
CORS_ORIGIN=https://your-frontend-deployment-url
```

### Frontend Environment Variables
```env
# API Configuration
VITE_API_BASE_URL=https://your-backend-deployment-url/api
VITE_WEBSOCKET_URL=wss://your-backend-deployment-url

# Payment Configuration
VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_public_key

# App Configuration
VITE_APP_NAME=BrillPrime
VITE_APP_VERSION=1.0.0
```

## Installation & Setup

### 1. Repository Setup
```bash
# Clone repository
git clone <your-repository-url>
cd brillprime

# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..

# Install mobile dependencies (optional)
cd mobile
npm install
cd ..
```

### 2. Database Setup
```bash
# Create .env file with database URL
echo "DATABASE_URL=your_postgresql_url" > .env

# Test database connection
npm run db:test

# Run migrations (automatic on first server start)
npm run db:migrate
```

### 3. Development Testing
```bash
# Start backend development server
npm run dev

# In another terminal, start frontend development
cd client
npm run dev
```

## Deployment Process

### Option 1: Replit Deployment (Recommended)

#### Backend Deployment
1. **Create Replit Project**
   - Import from GitHub repository
   - Select Node.js template

2. **Configure Environment**
   ```bash
   # Set environment variables in Replit
   DATABASE_URL=your_render_postgresql_url
   NODE_ENV=production
   JWT_SECRET=your_secret
   SESSION_SECRET=your_secret
   PAYSTACK_SECRET_KEY=your_key
   ```

3. **Deploy Configuration**
   - **Run Command**: `npm run dev`
   - **Build Command**: `npm install --legacy-peer-deps`
   - **Port**: 5000 (automatically configured)

#### Frontend Deployment (Same Repl)
The current setup serves frontend from the same Repl:
```typescript
// Backend serves static files
app.use(express.static(path.join(__dirname, '../client/dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

#### Frontend Deployment (Separate Repl - Optional)
1. **Create New Replit Project**
   - Upload only `client/` directory
   
2. **Configure Static Deployment**
   - **Type**: Static Site
   - **Build Command**: `npm install && npm run build`
   - **Public Directory**: `dist`
   - **Index Page**: `index.html`

3. **Update API Configuration**
   ```typescript
   // Update client/src/lib/api.ts
   const API_BASE_URL = 'https://your-backend-repl.replit.app/api';
   ```

### Option 2: Traditional VPS Deployment

#### Server Setup (Ubuntu 20.04+)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y
```

#### Application Deployment
```bash
# Clone and setup
git clone <repository> /var/www/brillprime
cd /var/www/brillprime

# Install dependencies
npm install
cd client && npm install && npm run build && cd ..

# Configure PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend (static files)
    location / {
        root /var/www/brillprime/client/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Database Management

### PostgreSQL Setup (Render)
1. **Create Database Service**
   - Go to Render dashboard
   - Create PostgreSQL service
   - Note connection string

2. **Configure Connection**
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/db
   ```

3. **Migration & Seeding**
   ```bash
   # Migrations run automatically on server start
   # Or run manually:
   npm run db:migrate
   npm run db:seed
   ```

### Database Schema
The application automatically creates these tables:
- Users & Authentication (users, sessions, mfa_tokens)
- Orders & Transactions (orders, transactions, order_tracking)
- Location Services (driver_locations, delivery_zones)
- Admin & Support (support_tickets, admin_actions)
- Security & Compliance (security_logs, verification_documents)

## Security Configuration

### SSL/TLS Setup
```bash
# For custom domain with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Security Headers
```typescript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

### Rate Limiting
```typescript
// API rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);
```

## Monitoring & Maintenance

### Health Monitoring
```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: await checkDatabaseConnection(),
    memory: process.memoryUsage(),
  };
  res.json(health);
});
```

### Logging Configuration
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### Performance Monitoring
```bash
# PM2 monitoring
pm2 monit

# System monitoring
htop
iotop
```

## Mobile App Deployment

### Android Deployment
```bash
cd mobile
npm run build:android
```

### iOS Deployment (macOS required)
```bash
cd mobile
npm run build:ios
```

## Scaling Considerations

### Horizontal Scaling
- **Load Balancing**: Nginx or cloud load balancers
- **Multiple Instances**: PM2 cluster mode or container orchestration
- **Database Scaling**: Read replicas and connection pooling

### Performance Optimization
- **Caching**: Redis for session and data caching
- **CDN**: Static asset delivery optimization
- **Database Indexing**: Optimize query performance

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"
```

#### API Connectivity
```bash
# Test API endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/api/auth/validate-session
```

#### Frontend Build Issues
```bash
cd client
rm -rf node_modules dist
npm install
npm run build
```

### Debug Commands
```bash
# Check application logs
pm2 logs brillprime

# Monitor system resources
top
df -h
free -m

# Check nginx status
sudo systemctl status nginx
```

## Security Checklist

- [ ] SSL certificate configured and auto-renewing
- [ ] Environment variables secured (no plain text secrets)
- [ ] Database access restricted to application servers
- [ ] Rate limiting enabled on all API endpoints
- [ ] CORS configured properly for production domains
- [ ] Security headers implemented (Helmet.js)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection enabled
- [ ] Session security configured

## Performance Checklist

- [ ] Database queries optimized with proper indexes
- [ ] Static assets compressed (gzip)
- [ ] Images optimized and properly sized
- [ ] CDN configured for static assets
- [ ] API response caching implemented
- [ ] Database connection pooling configured
- [ ] Memory usage monitored and optimized
- [ ] Error logging and monitoring setup

Your BrillPrime application is now ready for production deployment with optimal performance and security! 🚀
