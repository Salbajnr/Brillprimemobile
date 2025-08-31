#!/bin/bash

echo "🛠️  Starting BrillPrime Platform - Development Mode"
echo "================================================="

# Function to print colored output
print_step() {
    echo -e "\n🔄 $1"
}

print_success() {
    echo -e "✅ $1"
}

# Install all dependencies
print_step "Installing dependencies..."
npm install

print_step "Installing client dependencies..."
cd client && npm install && cd ..

print_step "Installing admin dependencies..."  
cd admin && npm install && cd ..

print_success "All dependencies installed"

# Start development server
print_step "Starting development server..."
echo "🌟 Development server will be available at http://0.0.0.0:5000"
echo "🔥 Hot reload enabled - code changes will automatically restart server"
echo ""

npm run dev