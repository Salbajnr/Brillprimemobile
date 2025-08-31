#!/bin/bash

echo "🚀 Building BrillPrime - Integrated Frontend + Backend"
echo "=================================================="

# Build the frontend first
echo "📦 Building frontend..."
cd client
npx vite build --mode production
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Frontend built successfully"

# Go back to root and start the server
cd ..
echo "🚀 Starting integrated server..."
NODE_ENV=production tsx server/index.ts