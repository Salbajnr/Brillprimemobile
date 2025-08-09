
# BrillPrime Monorepo

A comprehensive financial services platform with web, native mobile, and admin applications.

## Project Structure

```
brillprime-monorepo/
├── apps/
│   ├── web/          # React web application
│   ├── native/       # React Native mobile app
│   └── admin/        # Admin dashboard
├── packages/
│   ├── shared/       # Shared types and schemas
│   └── server/       # Express.js backend server
└── tests/           # E2E and integration tests
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
```bash
npm install
```

### Development
```bash
# Start web app and server
npm run dev

# Start individual apps
npm run dev:web      # Web app on port 5173
npm run dev:native   # React Native bundler
npm run dev:admin    # Admin dashboard on port 5174
npm run dev:server   # Backend server on port 5000
```

### Building
```bash
# Build all apps
npm run build

# Build individual apps
npm run build:web
npm run build:native
npm run build:admin
```

### Testing
```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e
```

## Workspaces

This monorepo uses npm workspaces to manage dependencies and enable code sharing between applications.

### Apps
- **@brillprime/web**: Main web application (React + Vite)
- **@brillprime/native**: Mobile application (React Native)
- **@brillprime/admin**: Admin dashboard (React + Vite)

### Packages
- **@brillprime/shared**: Shared types, schemas, and utilities
- **@brillprime/server**: Backend API server (Express.js)

## Features

- 🏪 Multi-role support (Consumer, Merchant, Driver, Admin)
- 💳 Integrated payment processing (Stripe, PayPal, Paystack)
- 💬 Real-time chat and notifications
- 📍 Location tracking and mapping
- 📱 Progressive Web App with native mobile app
- 🔐 Secure authentication and authorization
- 📊 Comprehensive analytics and reporting
