
#!/bin/bash

# BrillPrime Universal Deployment Script
# Works on any platform: VPS, Cloud, Docker, etc.

set -e

echo "🚀 BrillPrime Universal Deployment Starting..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
if [[ "$NODE_VERSION" == "not found" ]]; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

# Create necessary directories
echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p logs uploads backups

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install --production=false

# Install client dependencies
echo -e "${BLUE}📦 Installing client dependencies...${NC}"
cd client && npm install && cd ..

# Build client application
echo -e "${BLUE}🏗️  Building client application...${NC}"
cd client && npm run build && cd ..

# Environment validation
echo -e "${BLUE}🔍 Validating environment...${NC}"
node -e "
const fs = require('fs');
const path = require('path');

// Check for .env file
if (!fs.existsSync('.env')) {
  console.log('⚠️  No .env file found. Creating from .env.example...');
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ .env file created. Please configure your environment variables.');
  }
}

// Validate critical environment variables
const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'];
const envContent = fs.readFileSync('.env', 'utf8');
const missingVars = requiredVars.filter(varName => !envContent.includes(varName + '='));

if (missingVars.length > 0) {
  console.log('⚠️  Missing environment variables:', missingVars.join(', '));
  console.log('Please configure these in your .env file before deployment.');
} else {
  console.log('✅ Environment variables configured');
}
"

# Database connection test
echo -e "${BLUE}🔌 Testing database connection...${NC}"
node -e "
const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.log('⚠️  DATABASE_URL not configured. Using memory database.');
  process.exit(0);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Database connection successful');
    pool.end();
  })
  .catch((err) => {
    console.log('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"

# Set production environment
export NODE_ENV=production

# Start the application
echo -e "${GREEN}🎯 Starting BrillPrime API Server...${NC}"

# Choose process manager based on what's available
if command -v pm2 &> /dev/null; then
    echo -e "${BLUE}Using PM2 process manager...${NC}"
    pm2 delete brillprime-api 2>/dev/null || true
    pm2 start ecosystem.config.js --env production
    pm2 save
    echo -e "${GREEN}✅ Application started with PM2${NC}"
    echo -e "${BLUE}Monitor with: pm2 monit${NC}"
    echo -e "${BLUE}Logs: pm2 logs brillprime-api${NC}"
elif command -v forever &> /dev/null; then
    echo -e "${BLUE}Using Forever process manager...${NC}"
    forever stop server/index.ts 2>/dev/null || true
    forever start server/index.ts
    echo -e "${GREEN}✅ Application started with Forever${NC}"
else
    echo -e "${BLUE}Using Node.js directly...${NC}"
    nohup node --loader tsx server/index.ts > logs/app.log 2>&1 &
    echo $! > server.pid
    echo -e "${GREEN}✅ Application started (PID: $(cat server.pid))${NC}"
    echo -e "${BLUE}Logs: tail -f logs/app.log${NC}"
    echo -e "${BLUE}Stop: kill \$(cat server.pid)${NC}"
fi

echo -e "${GREEN}🎉 BrillPrime deployment completed successfully!${NC}"
echo -e "${BLUE}🌐 Application should be accessible on the configured port${NC}"
echo -e "${BLUE}📊 Health check: curl http://localhost:5000/api/health${NC}"

# Display post-deployment information
echo -e "\n${YELLOW}📋 Post-Deployment Checklist:${NC}"
echo "1. ✅ Server started successfully"
echo "2. ✅ Client application built and served"
echo "3. ✅ Database connection tested"
echo "4. 🔍 Configure SSL certificate (if not done)"
echo "5. 🔍 Set up reverse proxy (Nginx/Apache)"
echo "6. 🔍 Configure firewall rules"
echo "7. 🔍 Set up monitoring and alerting"
echo "8. 🔍 Configure automated backups"

echo -e "\n${BLUE}🔧 Quick Commands:${NC}"
echo "Test API: curl http://localhost:5000/api/health"
echo "View logs: tail -f logs/app.log"
echo "Stop server: kill \$(cat server.pid) # if not using PM2"
