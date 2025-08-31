#!/bin/bash

echo "🚀 Starting BrillPrime Platform"
echo "==============================="

# Build frontend
echo "📦 Building frontend..."
cd client
npx vite build --mode production
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
echo "✅ Frontend built successfully"

# Return to root and start server
cd ..
echo "🚀 Starting server..."
NODE_ENV=production tsx server/index.ts