# Brillprime - Financial Solutions Application

## Overview
Brillprime is a full-stack, mobile-first Progressive Web App (PWA) designed to provide secure financial transaction capabilities and user management for CONSUMERs, MERCHANTs, and DRIVERs in the Nigerian market. The project aims to offer a comprehensive financial services platform, including digital wallet functionality, payment methods, QR code scanning/generation, and a business marketplace.

## User Preferences
Preferred communication style: Simple, everyday language.
User roles: Updated to CONSUMER, MERCHANT, DRIVER (instead of DRIVER, VENDOR)
Backend: User has existing backend API - frontend connects to external API endpoints

## Recent Development Progress (January 2025)
**✓ Completed Migration from Replit Agent to Replit Environment**
- Successfully migrated entire project structure with PostgreSQL database
- Fixed all import errors and dependency issues
- Established working Express server with proper session management
- Created render.yaml configuration for external deployment with proper database integration
- Implemented smooth user experience flow matching specified authentication gateway
- Enhanced consumer journey with comprehensive checkout and order tracking systems
- Verified all core functionalities working properly in Replit environment

**✓ Implemented Comprehensive Transaction Management System**
- Built advanced admin dashboard with sophisticated transaction filtering
- Created real-time transaction controls (hold, release, cancel operations)
- Developed detailed transaction modal with complete payment information
- Implemented secure refund processing interface with validation
- Added bulk action capabilities for managing multiple transactions
- Integrated WebSocket support for real-time updates
- Enhanced backend API with comprehensive admin endpoints

**✓ Implemented Real-Time Order Status Broadcasting System**
- Created comprehensive order status broadcasting service with real-time updates
- Built kitchen/preparation time updates with estimated delivery times
- Implemented pickup and delivery confirmation systems with photo proof
- Added role-specific notifications for customers, merchants, and drivers
- Integrated location tracking and driver location broadcasting
- Created WebSocket-based real-time communication for all order parties
- Built order timeline tracking with status history

**✓ Implemented Live Chat System**
- Created customer-to-driver messaging for delivery communication
- Built customer-to-merchant chat for order inquiries and support
- Implemented support chat integration with escalation capabilities
- Added typing indicators, read receipts, and message history
- Created chat room management with user presence tracking
- Integrated voice messages, location sharing, and image support
- Built quick response templates for common scenarios
- Added chat escalation to support ticket system

**✓ Implemented Comprehensive Social Authentication System**
- Built complete social login backend functionality for Google, Apple, and Facebook
- Created dedicated social authentication module (server/auth/social-auth.ts) with OAuth integration
- Enhanced database schema with social profiles table for secure account linking
- Implemented token verification and validation for all three social providers
- Added account linking capabilities to connect social accounts with existing users
- Created seamless user experience between regular and social login methods
- Built client-side social authentication utilities with SDK integration
- Added comprehensive social login UI components with proper error handling
- Integrated session management and JWT authentication for social users
- Successfully deployed database schema changes with social login support

**✓ Fixed Driver Role Flow (January 2025)**
- Permanently fixed driver registration and authentication flow
- Corrected flow: role selection → signup/signin → OTP verification → driver tier selection → driver dashboard
- Added proper KYC verification prompting for new drivers accessing dashboard
- Updated both new signup and existing signin paths for consistent driver experience
- Implemented session storage for driver tier tracking across authentication flow

**✓ Enhanced Order Tracking for All Delivery Types**
- Expanded order tracking system beyond fuel delivery to support all order types
- Created unified order tracking interface handling both fuel orders and regular product orders
- Built comprehensive order status broadcasting with real-time updates for all delivery scenarios
- Enhanced order management with driver assignment for all order types
- Integrated location tracking and delivery confirmation for universal order support

**✓ Implemented Comprehensive Merchant & Driver Dashboard Flows (January 2025)**
- Built complete merchant dashboard exactly matching specified flow requirements
- Implemented business overview with today's sales, active orders, customer count, and inventory alerts
- Created order management workflow with 15-second accept/decline timer and real-time notifications
- Added product catalog management with inventory tracking, stock alerts, and performance analytics
- Integrated business operations panel with customer insights, revenue analytics, and settings management
- Built payment & finances section with escrow balance monitoring and withdrawal capabilities
- Developed enhanced driver dashboard with comprehensive online/offline status management
- Implemented delivery request system with 15-second timer and route preview functionality
- Created complete delivery workflow from pickup to completion with photo/signature proof
- Added special delivery handling for fuel, high-value items, and temperature-sensitive orders
- Built earnings tracking with real-time calculation and performance metrics dashboard
- Integrated driver tier system (PREMIUM/STANDARD) with appropriate access controls
- Added comprehensive verification status management with KYC prompting

**✓ Implemented Complete Merchant Feed System**
- Created comprehensive vendor feed API (server/routes/vendor-feed.ts) with full CRUD operations
- Built merchant post creation with pricing, promotions, and product announcements
- Implemented post engagement features (likes, comments, view tracking)
- Added merchant analytics for post performance monitoring
- Created real-time notifications for new posts and engagement
- Integrated automatic post generation for product updates and restocking
- Built advanced filtering and pagination for merchant feed content

**✓ Enhanced Product Management System**
- Developed complete product management API (server/routes/products.ts) with full merchant capabilities
- Created product CRUD operations with pricing, inventory, and category management
- Implemented automatic vendor feed integration for product lifecycle events
- Built comprehensive product filtering with search, category, and price range options
- Added merchant-specific product analytics and performance tracking
- Created stock management with automatic restock notifications via vendor feed
- Integrated real-time product updates and notifications

## System Architecture
The application is built as a monorepo with distinct client, server, shared components, and admin dashboard.

**Core Technologies:**
- **Frontend**: React SPA with TypeScript, Vite, Tailwind CSS, and shadcn/ui.
- **Backend**: Express.js REST API server (connects to external API).
- **Database**: PostgreSQL with Drizzle ORM.
- **Admin Dashboard**: Separate admin interface with backend API for admin operations.
- **Shared**: Common schemas and types.

**Frontend Architecture:**
- **Routing**: Wouter for client-side routing.
- **State Management**: Zustand for authentication state.
- **Data Fetching**: TanStack Query for server state management.
- **Form Handling**: React Hook Form with Zod validation.
- **UI Components**: shadcn/ui component library built on Radix UI primitives.
- **Styling**: Tailwind CSS with custom design tokens and a consistent color scheme (Primary: #4682b4, Secondary: #0b1a51, Active: #010e42).
- **Design Principles**: Mobile-first, responsive design with consistent rounded borders (rounded-3xl) and 3D visual effects (depth shadows, gradient backgrounds, shimmer effects on buttons) for enhanced interactivity.
- **Key UI Elements**: Standardized icon usage (edit_icon.png, scan_qr_code_white.png, plus_icon.svg, minus_icon.svg, view_cart.png), notification modal system, biometric authentication UI, social login integration, standardized chat UI, and detailed order/delivery views.

**Backend Architecture:**
- **External API Integration**: The frontend primarily interacts with an existing external REST API for core functionalities like authentication, user management, and transactions.
- **Authentication**: API handles bcrypt password hashing, OTP-based email verification.
- **Data Layer**: PostgreSQL database with Drizzle ORM for local data management.
- **Server Role**: The current server implementation primarily serves the frontend client and routes API requests.
- **Admin Dashboard**: Comprehensive React TypeScript admin interface with user management, KYC verification, and role-based access control featuring search/filter functionality, document review workflows, and batch processing capabilities.

**Key Features & Flows:**
- **Authentication System**: Splash screen, 3-screen onboarding, role selection (CONSUMER/MERCHANT/DRIVER), social login (Google, Apple, Facebook), email/password sign-up/sign-in, 5-digit OTP verification, forgot/reset password flow, biometric authentication (fingerprint/Face ID).
- **User & Profile Management**: Comprehensive profile editing with image upload, account settings (security, notifications, privacy), and unique user ID assignment (BP-000001).
- **Financial Features**: Digital wallet, payment methods management (cards, bank transfer), shopping cart system (for commodities/orders), and checkout flow.
- **Marketplace & Services**: Business marketplace with diverse categories, vendor feed with business-oriented interactions (Add to Cart, Quote Request, Add to Wishlist), merchant search, bill payments, fuel ordering, toll payments.
- **Communication & Support**: Real-time chat system for vendor-customer communication (including quote requests), universal support ticket system.
- **Role-Based Dashboards**: Tailored dashboards for Consumers, Merchants, and Drivers, including a two-tier driver system (PREMIUM/STANDARD) with specific access levels.
- **Order & Delivery Management**: Universal order history system with detailed views for all user types, delivery detail pages for drivers, QR scanning for delivery confirmation.
- **Admin Management System**: Full-featured admin dashboard with user management (search, filter, status updates), KYC verification interface (document review, approval workflow, batch processing), merchant/driver application processing, support ticket management, fraud detection, real-time monitoring, system maintenance tools, and comprehensive transaction management with advanced filtering, refund processing, and real-time controls.
- **PWA Capabilities**: Service worker for offline functionality and app manifest for mobile installation.

## External Dependencies

**Core Libraries:**
- **Database**: `@neondatabase/serverless` (Neon PostgreSQL) - *Note: Managed by external backend.*
- **ORM**: `drizzle-orm` with `drizzle-kit` - *Note: Managed by external backend.*
- **Authentication**: `bcrypt` for password hashing - *Note: Managed by external backend.*
- **Session Management**: `connect-pg-simple` for PostgreSQL session store - *Note: Managed by external backend.*
- **UI Framework**: `react` with `@radix-ui` components
- **Forms**: `react-hook-form` with `@hookform/resolvers`
- **Validation**: `zod` for schema validation
- **Styling**: `tailwindcss` with `class-variance-authority`
- **Mapping**: Google Maps Static API (via `VITE_GOOGLE_MAPS_API_KEY`)
- **Social Authentication**: Google Identity Services, AppleID authentication, Facebook SDK (via `VITE_GOOGLE_CLIENT_ID`, `VITE_APPLE_CLIENT_ID`, `VITE_FACEBOOK_APP_ID`)

**Development Tools:**
- **Build**: `Vite` (frontend), `esbuild` (backend)
- **Type Checking**: `TypeScript`
- **Linting**: `ESLint`
- **Development**: `tsx`
- **Testing**: `Jest`