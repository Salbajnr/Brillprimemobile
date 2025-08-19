
# BrillPrime Deployment Guide

## Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon or self-hosted)
- Redis instance (optional, app falls back to memory store)
- Domain name and SSL certificate

## Environment Setup

### 1. Database Configuration
Update your `.env` file with your Neon PostgreSQL connection string:
```env
DATABASE_URL=postgresql://username:password@your-neon-host/database_name?sslmode=require
```

### 2. Required Environment Variables
Copy `.env.example` to `.env` and configure:

**Critical Settings:**
- `DATABASE_URL` - Your Neon PostgreSQL connection
- `JWT_SECRET` - 32+ character random string
- `SESSION_SECRET` - 32+ character random string
- `NODE_ENV=production`
- `PORT=5000`

**Payment Integration:**
- `PAYSTACK_SECRET_KEY` - Your Paystack secret key
- `PAYSTACK_PUBLIC_KEY` - Your Paystack public key

**Social Authentication:**
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret

### 3. Redis Configuration (Optional)
For production, configure Redis:
```env
REDIS_URL=redis://your-redis-host:6379
```
Or set `REDIS_DISABLED=true` to use memory store.

## Installation Steps

### 1. Clone and Install
```bash
git clone <your-repository>
cd brillprime
npm install
cd client && npm install && cd ..
cd mobile && npm install && cd ..
```

### 2. Build Client
```bash
cd client
npm run build
cd ..
```

### 3. Database Setup
```bash
# The app will auto-create tables on first run
# Or manually run migrations if needed
```

### 4. Start Production Server
```bash
NODE_ENV=production npm start
```

## Hosting Options

### Option 1: VPS/Dedicated Server
- Ubuntu 20.04+ recommended
- Install Node.js, PM2, Nginx
- Configure reverse proxy and SSL

### Option 2: Platform as a Service
- Heroku, Railway, Render.com
- Configure build commands and environment variables

### Option 3: Cloud Platforms
- AWS EC2, Google Cloud, DigitalOcean
- Docker deployment available

## Nginx Configuration Example
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
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
}
```

## PM2 Process Management
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

## Security Checklist
- [ ] SSL certificate configured
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Security headers implemented

## Monitoring
- Application logs: `pm2 logs`
- Database monitoring via Neon dashboard
- Setup alerts for critical errors
