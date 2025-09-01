#!/bin/bash

echo "🚀 Starting BrillPrime Development Environment"
echo "=============================================="

# Function to handle cleanup
cleanup() {
    echo "🛑 Shutting down development servers..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "🖥️  Starting backend server..."
NODE_ENV=development tsx server/index.ts &

echo "⚛️  Starting frontend development server..."
cd client && npm run dev &

echo "✅ Both servers starting..."
echo "📡 Backend: http://localhost:5000"
echo "🌐 Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both servers"

# Wait for all background processes
wait