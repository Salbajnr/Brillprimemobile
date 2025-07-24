#!/bin/bash

# Brillprime Development Server Launcher
echo "🚀 Starting Brillprime Development Server..."

# Set environment
export NODE_ENV=development
export PORT=${PORT:-3000}

# Try to run with npx tsx (which works)
echo "✅ Using npx tsx to run TypeScript server..."
npx tsx server/index.ts