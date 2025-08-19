
#!/bin/bash

# BrillPrime Deployment Script
set -e

echo "🚀 Starting BrillPrime deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.production to .env and configure it."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd client && npm install && cd ..
cd mobile && npm install && cd ..

# Build client
echo "🏗️ Building client application..."
cd client && npm run build && cd ..

# Create logs directory
mkdir -p logs

# Check database connection
echo "🔌 Checking database connection..."
npm run check:db || {
    echo "❌ Database connection failed. Please check your DATABASE_URL."
    exit 1
}

# Start application with PM2
echo "🎯 Starting application with PM2..."
pm2 delete brillprime-api 2>/dev/null || true
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

echo "✅ Deployment completed successfully!"
echo "🌐 Application is running on port 5000"
echo "📊 Monitor with: pm2 monit"
echo "📝 View logs with: pm2 logs brillprime-api"
