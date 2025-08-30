
# 🚀 BrillPrime - Multi-Service Delivery Platform

A comprehensive financial services and delivery platform built for the Nigerian market, featuring real-time tracking, secure payments, multi-factor authentication, and advanced verification systems.

## 🌟 Overview

BrillPrime is a full-stack delivery and financial services platform that connects consumers, merchants, and drivers through an integrated ecosystem. The platform supports commodity delivery, fuel delivery, toll payments, money transfers, and comprehensive financial services with enterprise-grade security.

## 🏗️ Architecture

### Separate Deployment Strategy
- **Backend**: Deployed on Replit (API server with real-time features)
- **Frontend**: Deployed separately as Static Deployment on Replit
- **Database**: Render PostgreSQL (shared between deployments)
- **Communication**: Frontend connects to backend via HTTPS API calls

### Frontend
- **React 18** with TypeScript and Tailwind CSS
- **Vite** for fast development and building
- **Progressive Web App (PWA)** capabilities
- **Responsive design** for mobile, tablet, and desktop
- **Real-time updates** via WebSocket connections

### Backend
- **Node.js** with Express and TypeScript
- **PostgreSQL** database with Drizzle ORM
- **Redis** for caching and session management (optional)
- **Socket.io** for real-time communication
- **Paystack** integration for payments

### Mobile
- **React Native** application
- **35+ screens** with complete feature parity
- **Native optimization** for iOS and Android
- **Offline support** and data synchronization

## 🎯 Key Features

### 👥 Multi-Role System
- **Consumer**: Order commodities, fuel delivery, toll payments, money transfers
- **Merchant**: Manage inventory, process orders, business analytics
- **Driver**: Accept deliveries, real-time tracking, earnings management
- **Admin**: Platform oversight, user management, fraud detection

### 🔐 Security & Compliance
- **Multi-Factor Authentication (MFA)** with SMS, Email, and TOTP
- **Biometric authentication** (Face ID, Fingerprint)
- **Enhanced KYC verification** with document validation
- **Fraud detection** and suspicious activity monitoring
- **Nigerian regulatory compliance** (NIN, BVN integration)
- **PCI DSS compliance** for payment processing

### 💰 Financial Services
- **Digital wallet** with instant transactions
- **Escrow management** for secure transactions
- **Money transfers** with real-time processing
- **Bill payments** and utilities
- **QR code payments** for toll gates
- **Multi-payment methods** (Cards, Bank transfers, Wallet)

### 📦 Delivery Services
- **Commodity delivery** with inventory management
- **Fuel delivery** with scheduling and tracking
- **Real-time GPS tracking** for all deliveries
- **Estimated delivery times** with live updates
- **Order management** and history

### 💬 Communication
- **Live chat system** with WebSocket real-time messaging
- **Support ticket system** with priority management
- **Push notifications** for order updates
- **In-app messaging** between users and drivers

### 📊 Analytics & Monitoring
- **Real-time dashboard** with live metrics
- **Business analytics** for merchants
- **Driver performance tracking**
- **System health monitoring**
- **Fraud detection analytics**

## 🛠️ Technology Stack

### Core Technologies
```
Frontend:    React 18, TypeScript, Tailwind CSS, Vite
Backend:     Node.js, Express, TypeScript
Database:    PostgreSQL with Drizzle ORM
Cache:       Redis (optional)
Real-time:   Socket.io WebSockets
Mobile:      React Native (iOS/Android)
```

### Payment Integration
```
Primary:     Paystack (Cards, Bank transfers, USSD)
Wallets:     Digital wallet system with escrow
QR Codes:    Toll gate payments and merchant transactions
```

### Security & Compliance
```
Auth:        Session-based with JWT fallback
MFA:         SMS, Email, TOTP (Speakeasy)
Biometrics:  Face ID, Fingerprint recognition
KYC:         Document verification with AI validation
Encryption:  TLS 1.3, bcrypt password hashing
```

## 📱 Application Structure

### Web Application (client/)
```
src/
├── components/ui/          # Reusable UI components
├── pages/                  # Application pages/routes
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and API clients
└── assets/                 # Images and static files
```

### Mobile Application (mobile/)
```
src/
├── screens/               # Mobile screens (35+ screens)
├── components/            # Mobile-specific components
├── navigation/            # React Navigation setup
├── services/              # API and native services
└── utils/                 # Mobile utilities
```

### Backend Server (server/)
```
├── routes/                # API route handlers (40+ endpoints)
├── middleware/            # Authentication, validation, security
├── services/              # Business logic and integrations
├── admin/                 # Administrative interfaces
└── websocket/             # Real-time WebSocket handlers
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- Redis 6+ (optional, fallback to memory store)

### Installation & Setup

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd brill-prime
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Configure your environment variables
```

3. **Database Setup**
```bash
# PostgreSQL should be running
npm run db:migrate
npm run db:seed
```

4. **Start Development Server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### Frontend Development (Separate)
```bash
cd client
npm install
npm run dev  # Development server
npm run build  # Production build
```

### Mobile Development
```bash
cd mobile
npm install
npm run android  # For Android
npm run ios      # For iOS (macOS only)
```

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/brillprime

# Redis (optional)
REDIS_URL=redis://localhost:6379
REDIS_DISABLED=false

# Paystack
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...

# Security
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret-key

# API Configuration
API_BASE_URL=http://localhost:5000
```

## 🚀 Deployment

### Separate Deployment Strategy

#### Backend Deployment (Replit)
1. Configure production environment variables
2. Set up PostgreSQL database connection
3. Configure Redis (optional)
4. Deploy backend using Replit's deployment system
5. Backend will be accessible at your Replit deployment URL

#### Frontend Deployment (Replit Static)
1. Build the React application: `cd client && npm run build`
2. Create a separate Replit for frontend
3. Configure Static Deployment:
   - **Build command**: `cd client && npm run build`
   - **Public directory**: `client/dist`
   - **Index page**: `index.html`
4. Set API_BASE_URL to point to your backend deployment

#### Mobile App Deployment
```bash
# Android
cd mobile
npm run build:android

# iOS (requires macOS and Xcode)
npm run build:ios
```

### Benefits of Separate Deployment
1. **Independent scaling**: Scale frontend and backend separately
2. **Faster deployments**: Deploy frontend changes without backend rebuild
3. **Resource optimization**: Static frontend uses fewer resources
4. **Better caching**: CDN can cache static assets effectively
5. **Easier maintenance**: Separate concerns and repositories

## 📊 Database Schema

### Core Tables (31+ tables)
- **Users & Authentication**: Enhanced user profiles with MFA and biometrics
- **Orders & Transactions**: Comprehensive order and payment tracking
- **Location Services**: Real-time GPS tracking and geofencing
- **Admin & Support**: Platform management and customer support
- **Security & Compliance**: Fraud detection and verification systems

### Key Relationships
```sql
Users (1:N) → Orders → Transactions
Users (1:1) → DriverProfiles/MerchantProfiles
Orders (1:N) → OrderTracking
Users (1:N) → Wallets → PaymentMethods
```

## 🔒 Security Features

### Authentication
- Session-based authentication with secure cookies
- JWT token fallback for API access
- Password encryption with bcrypt
- Account lockout after failed attempts

### Multi-Factor Authentication
- SMS verification via Nigerian telecom providers
- Email-based verification
- TOTP (Time-based One-Time Password) support
- Backup codes for account recovery

### Verification Systems
- Identity verification with NIN/BVN integration
- Document upload and AI-powered validation
- Driver background checks and vehicle verification
- Merchant business verification

### Fraud Prevention
- Real-time transaction monitoring
- Suspicious activity detection
- IP address and device tracking
- Admin fraud alert system

## 📈 Performance & Monitoring

### Real-time Capabilities
- WebSocket connections for live updates
- GPS tracking with 10-second intervals
- Live chat with message delivery confirmation
- Real-time order status updates

### Monitoring & Analytics
- System health monitoring dashboard
- Real-time metrics and KPIs
- Error logging and alerting
- Performance optimization tools

### Caching Strategy
- Redis caching for frequently accessed data
- Session storage optimization
- API response caching
- Static asset optimization

## 🚦 API Endpoints

### Authentication
```
POST /api/auth/register       # User registration
POST /api/auth/login          # User login
POST /api/auth/logout         # User logout
POST /api/auth/mfa/setup      # MFA configuration
```

### Orders & Delivery
```
GET  /api/orders              # Get user orders
POST /api/orders              # Create new order
PUT  /api/orders/:id/status   # Update order status
GET  /api/tracking/:id        # Real-time tracking
```

### Payments & Wallet
```
GET  /api/wallet/balance      # Get wallet balance
POST /api/wallet/fund         # Fund wallet
POST /api/payments/transfer   # Money transfer
POST /api/payments/toll       # Toll payments
```

### Admin & Management
```
GET  /api/admin/dashboard     # Admin dashboard
GET  /api/admin/users         # User management
POST /api/admin/kyc/review    # KYC verification
GET  /api/admin/analytics     # Platform analytics
```

## 🧪 Testing

### End-to-End Testing
```bash
cd client
npm run test:e2e              # Run all E2E tests
npm run test:e2e:headed       # Run with browser UI
npm run test:e2e:debug        # Debug mode
```

### Mobile Testing
```bash
cd mobile
npm test                      # Unit tests
npm run test:e2e             # Mobile E2E tests
```

### Test Coverage
- Authentication flows
- Payment processing
- Order management
- Real-time features
- Security scenarios

## 📚 API Documentation

### Authentication Headers
```javascript
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### WebSocket Events
```javascript
// Real-time order updates
socket.on('order_status_updated', (data) => {
  // Handle order status change
});

// Live chat messages
socket.on('new_message', (message) => {
  // Handle new chat message
});

// Driver location updates
socket.on('driver_location_updated', (location) => {
  // Update driver position on map
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

### Code Standards
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Conventional commits for version control
- Comprehensive test coverage

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

## 🔮 Roadmap

### Upcoming Features
- [ ] Advanced analytics dashboard
- [ ] Loyalty and rewards program
- [ ] Multi-language support
- [ ] Advanced AI fraud detection
- [ ] API marketplace for third-party integrations
- [ ] Enhanced driver analytics
- [ ] Merchant inventory management AI

### Performance Improvements
- [ ] Database query optimization
- [ ] Caching layer enhancements
- [ ] Mobile app performance optimization
- [ ] Real-time scaling improvements

---

**BrillPrime** - Revolutionizing delivery and financial services in Nigeria 🇳🇬

Built with ❤️ using modern web technologies and best practices.
