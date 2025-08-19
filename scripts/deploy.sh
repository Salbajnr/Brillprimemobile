
#!/bin/bash

# BrillPrime Deployment Script
set -e

echo "🚀 Starting BrillPrime deployment..."

# Validate environment
echo "🔍 Validating environment..."
node scripts/validate-env.js || {
    echo "❌ Environment validation failed."
    exit 1
}

# Check if required tools are installed
command -v pm2 >/dev/null 2>&1 || {
    echo "❌ PM2 is not installed. Installing..."
    npm install -g pm2
}

# Install dependencies
echo "📦 Installing dependencies..."
npm install || {
    echo "❌ Failed to install dependencies."
    exit 1
}

cd client && npm install && cd .. || {
    echo "❌ Failed to install client dependencies."
    exit 1
}

cd mobile && npm install && cd .. || {
    echo "❌ Failed to install mobile dependencies."
    exit 1
}

# Build client
echo "🏗️ Building client application..."
npm run build || {
    echo "❌ Build failed."
    exit 1
}

# Create logs directory
mkdir -p logs
mkdir -p uploads

# Check database connection
echo "🔌 Checking database connection..."
npm run check:db || {
    echo "❌ Database connection failed. Please check your DATABASE_URL."
    exit 1
}

# Run database migrations
echo "📊 Running database migrations..."
npm run db:push || {
    echo "❌ Database migration failed."
    exit 1
}

# Stop existing PM2 process
echo "🛑 Stopping existing processes..."
pm2 delete brillprime-api 2>/dev/null || true

# Start application with PM2
echo "🎯 Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup --skip-env || true

echo "✅ Deployment completed successfully!"
echo "🌐 Application is running on port 5000"
echo "📊 Monitor with: pm2 monit"
echo "📝 View logs with: pm2 logs brillprime-api"
echo "🔄 Restart with: pm2 restart brillprime-api"
echo "🛑 Stop with: pm2 stop brillprime-api"
