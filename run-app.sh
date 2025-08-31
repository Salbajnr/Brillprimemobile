#!/bin/bash

echo "🚀 Starting BrillPrime - Building and Running"
echo "============================================"

# Build frontend first
echo "📦 Building frontend..."
cd client && npx vite build --mode production
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Frontend built successfully"

# Go back to root and start the server
cd ..
echo "🚀 Starting server..."
exec NODE_ENV=production tsx server/index.ts