# Brillprime - Financial Solutions Application

## Overview
Brillprime is a full-stack, mobile-first Progressive Web App (PWA) providing secure financial transaction capabilities and user management for CONSUMERs, MERCHANTs, and DRIVERs in the Nigerian market. It aims to be a comprehensive financial services platform offering digital wallet functionality, various payment methods, QR code scanning/generation, and a business marketplace. The project's vision is to deliver a robust and user-friendly financial ecosystem, enhancing accessibility and efficiency for its users.

## User Preferences
Preferred communication style: Simple, everyday language.
User roles: Updated to CONSUMER, MERCHANT, DRIVER.
Backend: User has existing backend API - frontend connects to external API endpoints.

## System Architecture
The application is a monorepo structured with distinct client, server, shared components, and an admin dashboard.

**Core Technologies:**
- **Frontend**: React SPA with TypeScript, Vite, Tailwind CSS, and shadcn/ui.
- **Backend**: Express.js REST API server (primarily connects to external API).
- **Database**: PostgreSQL with Drizzle ORM.
- **Admin Dashboard**: Separate admin interface.

**Frontend Architecture:**
- **Routing**: Wouter.
- **State Management**: Zustand for authentication.
- **Data Fetching**: TanStack Query.
- **Form Handling**: React Hook Form with Zod validation.
- **UI Components**: shadcn/ui built on Radix UI.
- **Styling**: Tailwind CSS with a consistent color scheme (Primary: #4682b4, Secondary: #0b1a51, Active: #010e42).
- **Design Principles**: Mobile-first, responsive design with rounded borders (rounded-3xl) and 3D visual effects (depth shadows, gradient backgrounds, shimmer effects). Standardized icon usage and notification modal system.

**Backend Architecture:**
- **External API Integration**: Frontend primarily interacts with an existing external REST API.
- **Authentication**: Handles bcrypt password hashing and OTP-based email verification.
- **Data Layer**: PostgreSQL with Drizzle ORM for local data management.
- **Server Role**: Primarily serves the frontend and routes API requests.
- **Admin Dashboard**: React TypeScript interface with user management, KYC verification, and role-based access control.

**Key Features & Flows:**
- **Authentication System**: Onboarding, role selection, social login (Google, Apple, Facebook), email/password sign-up/sign-in, OTP verification, password recovery, biometric authentication.
- **User & Profile Management**: Profile editing, account settings, unique user ID assignment.
- **Financial Features**: Digital wallet, payment methods, shopping cart, checkout flow, secure transaction system with escrow management (automatic release triggers, dispute escalation).
- **Marketplace & Services**: Business marketplace, vendor feed with interactions, merchant search, bill payments, fuel ordering, toll payments.
- **Communication & Support**: Real-time chat system (customer-to-driver, customer-to-merchant, support), universal support ticket system.
- **Role-Based Dashboards**: Tailored dashboards for Consumers, Merchants, and Drivers (including a two-tier driver system).
- **Order & Delivery Management**: Universal order history, delivery detail pages, QR scanning for confirmation, real-time order status broadcasting with location tracking.
- **Admin Management System**: Comprehensive admin dashboard with real-time monitoring, user management, KYC verification, merchant/driver application processing, support ticket management, fraud detection, system maintenance, and transaction management with filtering and refund processing.
- **PWA Capabilities**: Service worker for offline functionality and app manifest.
- **Real-Time System**: Comprehensive WebSocket service for notifications, order tracking, chat, location tracking, and admin dashboard monitoring.

## External Dependencies

**Core Libraries:**
- **Mapping**: Google Maps Static API.
- **Social Authentication**: Google Identity Services, AppleID authentication, Facebook SDK.