#!/bin/bash

echo "🚀 Starting BrillPrime Platform - Building and Starting All Apps"
echo "==============================================================="

# Function to print colored output
print_step() {
    echo -e "\n🔄 $1"
}

print_success() {
    echo -e "✅ $1"
}

print_error() {
    echo -e "❌ $1"
}

# Set error handling
set -e

# Install root dependencies
print_step "Installing root dependencies..."
npm install
print_success "Root dependencies installed"

# Build client application
print_step "Building client application..."
cd client
npm install
npm run build
print_success "Client application built successfully"
cd ..

# Build admin application
print_step "Building admin application..."
cd admin
npm install  
npm run build
print_success "Admin application built successfully"
cd ..

# Start the production server
print_step "Starting BrillPrime production server..."
echo "🌟 Server will be available at http://0.0.0.0:5000"
echo "📱 Main app: http://0.0.0.0:5000"
echo "⚙️  Admin console: http://0.0.0.0:5000/admin"
echo ""

NODE_ENV=production npm run start