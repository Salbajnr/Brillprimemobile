
#!/bin/bash

# Database Migration Script
set -e

echo "🗄️ Running database migrations..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set. Please configure your environment."
    exit 1
fi

# Test database connection
echo "🔌 Testing database connection..."
npm run check:db || {
    echo "❌ Database connection failed."
    exit 1
}

# Run migrations
echo "📊 Pushing database schema..."
npm run db:push

echo "✅ Database migration completed!"
