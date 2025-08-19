
#!/bin/bash

# BrillPrime Production Setup Script
set -e

echo "🔧 Setting up BrillPrime for production..."

# Check Node.js version
NODE_VERSION=$(node --version)
echo "📦 Node.js version: $NODE_VERSION"

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p backups

# Set proper permissions
chmod +x scripts/deploy.sh
chmod +x scripts/setup-production.sh

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.production ]; then
        echo "📄 Copying .env.production to .env..."
        cp .env.production .env
        echo "⚠️  Please edit .env file with your actual values!"
    else
        echo "❌ No .env.production file found. Please create one."
        exit 1
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client && npm install && cd ..

# Install mobile dependencies
echo "📦 Installing mobile dependencies..."
cd mobile && npm install && cd ..

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Production setup completed!"
echo "📝 Next steps:"
echo "   1. Edit .env file with your configuration"
echo "   2. Run 'npm run deploy' to start the application"
echo "   3. Monitor with 'pm2 monit'"
