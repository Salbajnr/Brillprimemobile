
#!/bin/bash

# BrillPrime Render Deployment Script
set -e

echo "🚀 Deploying BrillPrime to Render..."

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install --legacy-peer-deps

echo -e "${BLUE}📦 Installing client dependencies...${NC}"
cd client && npm install --legacy-peer-deps && cd ..

echo -e "${BLUE}🏗️  Building client application...${NC}"
cd client && npm run build && cd ..

echo -e "${BLUE}🔍 Validating environment...${NC}"
node -e "
const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'];
const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.log('❌ Missing environment variables:', missing.join(', '));
  process.exit(1);
}
console.log('✅ Environment variables validated');
"

echo -e "${BLUE}🔌 Testing database connection...${NC}"
node -e "
const { Pool } = require('pg');
require('dotenv').config();
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

echo -e "${GREEN}✅ Ready for Render deployment!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Push this code to your GitHub repository"
echo "2. Connect the repository to Render"
echo "3. Deploy using the render.yaml configuration"
echo "4. Your app will be available at: https://brillprime-backend.onrender.com"
