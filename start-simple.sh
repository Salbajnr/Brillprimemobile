#!/bin/bash

echo "🚀 Starting BrillPrime (Simple Mode)"
echo "==================================="

# Kill any existing processes
pkill -f "tsx.*server" 2>/dev/null || echo "No existing processes"

# Make sure frontend is built
echo "📦 Building frontend..."
cd client && npx vite build --mode production && cd ..

echo "🚀 Starting server..."
exec env NODE_ENV=production tsx server/index.ts