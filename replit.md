# Brillprime - Financial Solutions Application

## Overview

Brillprime is a full-stack financial services web application built with a modern tech stack. It's designed as a mobile-first Progressive Web App (PWA) that serves two main user types: Drivers and Vendors. The application provides secure authentication, user management, and financial transaction capabilities with a focus on the Nigerian market.

## User Preferences

Preferred communication style: Simple, everyday language.
User roles: Updated to CONSUMER, MERCHANT, DRIVER (instead of DRIVER, VENDOR)
Backend: FRONTEND-ONLY - User has existing backend API, no backend development needed
API Integration: Frontend connects to external API endpoints only

## System Architecture

The application follows a monorepo structure with clear separation between client, server, and shared code:

- **Frontend**: React SPA with TypeScript, using Vite for bundling
- **Backend**: Express.js REST API server
- **Database**: PostgreSQL with Drizzle ORM
- **Shared**: Common schemas and types between frontend and backend
- **Styling**: Tailwind CSS with shadcn/ui component library

### Directory Structure
```
├── client/          # React frontend application
│   └── src/
│       └── assets/
│           └── images/  # All image and icon assets (44 files)
├── server/          # Express.js backend API
├── shared/          # Shared schemas and types
├── attached_assets/ # Static assets and documentation
└── migrations/      # Database migration files
```

## Key Components

### Frontend Architecture
- **React Router**: Using Wouter for lightweight client-side routing
- **State Management**: Zustand for authentication state
- **Data Fetching**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for Brillprime brand

### Backend Architecture
- **No Backend Development**: Frontend-only implementation
- **External API Integration**: Connects to user's existing backend via REST API endpoints
- **Authentication**: External API handles all authentication, OTP, password management
- **Data Layer**: External backend manages all database operations
- **Frontend Role**: Pure client application consuming external API services

### Database Schema
The application uses two main tables:
- **users**: Stores user account information (name, email, phone, password, role, verification status)
- **otp_codes**: Manages one-time passwords for email verification

### Authentication Flow
1. User registration with role selection (Driver/Vendor)
2. OTP generation and email verification
3. Account activation upon successful OTP verification
4. Secure sign-in with password validation

## Data Flow

The application follows the comprehensive flow documentation exactly:

### App Launch Flow
1. **Splash Screen** (3s): Logo display → User state check → Navigation decision
   - First-time user → Onboarding flow
   - Returning user (valid session) → Dashboard
   - Returning user (invalid session) → Account type selection

### Authentication Flow
2. **User Registration**: Client submits user data → Server validates and creates user → OTP generated and stored → User receives verification email
3. **OTP Verification**: Client submits OTP → Server validates → Registration completed → Auto-login → Dashboard
4. **Authentication**: Client submits credentials → Server validates → User session established
5. **Protected Routes**: Client checks authentication state → Redirects to sign-in if unauthorized

## External Dependencies

### Core Libraries
- **Database**: @neondatabase/serverless (Neon PostgreSQL)
- **ORM**: drizzle-orm with drizzle-kit for migrations
- **Authentication**: bcrypt for password hashing
- **Session Management**: connect-pg-simple for PostgreSQL session store
- **UI Framework**: React with @radix-ui components
- **Forms**: react-hook-form with @hookform/resolvers
- **Validation**: zod for schema validation
- **Styling**: tailwindcss with class-variance-authority

### Development Tools
- **Build**: Vite for frontend, esbuild for backend
- **Type Checking**: TypeScript throughout the stack
- **Linting**: ESLint configuration
- **Development**: tsx for TypeScript execution

## Deployment Strategy

The application is configured for deployment on Replit with:

- **Development**: Vite dev server with HMR
- **Production**: Static frontend build (no backend needed)
- **External API**: All backend functionality handled by user's existing API
- **Environment**: Frontend-only React SPA
- **Build Process**: 
  - Frontend: Vite builds static files for deployment
  - No server components - pure static frontend

## Backend API Configuration

To connect to your existing backend API:

1. Create a `.env` file (copy from `.env.example`)
2. Set `VITE_API_BASE_URL` to your backend URL
3. Your API should support these endpoints:
   - `POST /auth/signup` - User registration
   - `POST /auth/verify-otp` - OTP verification
   - `POST /auth/signin` - User login
   - `POST /auth/resend-email-otp` - Resend OTP
   - `POST /auth/reset-password` - Password reset

### API Request/Response Format

**Signup Request:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "password": "password123",
  "phone": "1234567890",
  "role": "CONSUMER" | "MERCHANT" | "DRIVER"
}
```

**Success Response:**
```json
{
  "status": "Success",
  "message": "User registered successfully",
  "data": { "userId": "uuid" }
}
```

### Key Configuration Files
- `vite.config.ts`: Frontend build configuration with Replit-specific plugins
- `drizzle.config.ts`: Database schema and migration configuration
- `package.json`: Unified scripts for development and production
- `tsconfig.json`: TypeScript configuration for monorepo structure

The application includes PWA capabilities with service worker for offline functionality and app manifest for mobile installation.

## Next Steps & Implementation Roadmap

Based on the comprehensive user flow documentation, the following features are planned for implementation:

### Phase 1: Authentication Completion
- ✓ Enhanced social login UI (completed)
- ✓ 5-digit OTP verification (completed)
- → Forgot password flow implementation
- → Biometric authentication integration
- → Social login backend integration

### Phase 2: Profile Management
- → Profile picture upload functionality
- → Enhanced profile editing with validation
- → User settings and preferences
- → Security settings management
- → Notification preferences

### Phase 3: Dashboard & Core Features
- → Main dashboard/home screen design
- → Payment features implementation
- → Merchant discovery functionality
- → Bill payments integration
- → Transaction history display

### Phase 4: Advanced Features
- → QR code scanning and generation
- → Toll gate purchases
- → Commodities management
- → Real-time notifications
- → Offline functionality enhancements

### Technical Priorities
- External API integration for authentication endpoints
- Database schema implementation for user profiles
- Payment gateway integration
- Push notification system
- Progressive Web App optimization

## Recent Changes

### Asset Organization & Responsive Design (July 19, 2025)
- ✓ Created `client/src/assets/images/` directory structure
- ✓ Moved 44 image and icon files from root directory to organized asset folder
- ✓ Assets include app icons, logos, onboarding images, UI icons, and payment logos
- ✓ Root directory cleaned up for better project organization
- ✓ Fixed import paths to use relative imports (../assets/images/) due to vite config constraints

### UI/UX Enhancements (July 19, 2025)
- ✓ Created splash screen with Brillprime logo and loading animation
- ✓ Updated app routing: "/" → splash → "/onboarding" → role selection
- ✓ Replaced external Unsplash images with local onboarding images
- ✓ Added responsive design across all pages with sm/md/lg breakpoints
- ✓ Enhanced signin/signup pages with actual logo instead of "B" placeholder
- ✓ Improved profile page with local camera icon
- ✓ Made images and layouts automatically fit different screen sizes

### Color Scheme & Authentication Enhancement (July 19, 2025)
- ✓ Updated application to use custom color constants:
  - Primary: #4682b4 (Steel Blue)
  - Secondary: #0b1a51 (Dark Navy)
  - Active: #010e42 (Very Dark Blue)
  - Text: #131313 (Dark Gray)
  - White: #ffffff
- ✓ Enhanced role selection with clean dark blue styling
- ✓ Extended splash screen display to 4 seconds
- ✓ Added image preloading for smooth onboarding transitions
- ✓ Implemented social login options (Google, Apple, Facebook) in signin/signup
- ✓ Enhanced OTP verification with 5-digit code input and improved layout
- ✓ Added Terms & Privacy agreement section to signup flow

### Flow Optimization (July 19, 2025)
- ✓ Optimized user flow based on comprehensive documentation
- ✓ Maintained existing authentication structure while adding enhancements
- ✓ Improved OTP verification screen with logo and "Verify it's you" title
- ✓ Added email indicator with mail icon in verification screen
- ✓ Updated OTP verification to complete user registration and navigate to role-based dashboard
- ✓ Social login buttons now display as perfect circles with round borders
- ✓ Implemented smart navigation in splash screen with user state checking
- ✓ Added onboarding completion tracking for returning users
- ✓ Aligned app flow perfectly with comprehensive documentation

### Complete Authentication & Notification System (July 19, 2025)
- ✓ Implemented complete forgot password flow with email link functionality
- ✓ Created password reset page with token validation and secure password requirements
- ✓ Built comprehensive notification modal system with branded images:
  - Success modals using congratulations_icon.png for completed actions
  - Error modals using confirmation_fail_img.png for failures and validation errors
  - Email modals using mailbox.png for email confirmations and notifications
- ✓ Enhanced OTP verification with beautiful success/error modals instead of toasts
- ✓ Added password strength validation with clear requirements display
- ✓ Implemented secure password reset flow: Email → Token → New Password → Success

### Frontend-Only Architecture Migration (July 19, 2025)
- ✓ Completely removed backend components (server/, shared/ directories)
- ✓ Created frontend-only API types in client/src/types/api.ts for external backend integration
- ✓ Updated authentication system to connect to user's existing backend API endpoints:
  - POST /auth/signup - User registration
  - POST /auth/signin - User login
  - POST /auth/verify-otp - OTP verification
  - POST /auth/resend-email-otp - Resend OTP
  - POST /auth/reset-password - Password reset
- ✓ Fixed all import paths to use frontend-only types instead of shared backend schemas
- ✓ Resolved toast component import issues and restored proper UI component functionality
- ✓ Updated .env.example with external API configuration (VITE_API_BASE_URL)
- ✓ Modified project documentation to reflect pure frontend-only architecture
- ✓ Successfully running frontend-only Vite development server on port 5000

### Enhanced Profile Management System (July 19, 2025)
- ✓ Created comprehensive profile editing page with image upload functionality
- ✓ Implemented profile picture upload with camera access and image validation (5MB limit)
- ✓ Added complete personal information form with location/address fields
- ✓ Built Nigerian states selector and country selection for proper location data
- ✓ Created comprehensive account settings page with tabbed navigation:
  - Security tab: Password change with strength validation
  - Notifications tab: Granular push/email/transaction alert controls  
  - Privacy tab: Two-factor auth, data sharing, profile visibility settings
- ✓ Integrated notification modal system for all success/error feedback
- ✓ Connected profile page navigation to edit and settings pages
- ✓ Added form validation and real-time feedback for all profile operations
- ✓ Updated profile design to match provided vendor profile sample with centered labels and rounded inputs

### Advanced Authentication Features (July 19, 2025)
- ✓ Implemented biometric authentication system with WebAuthn API:
  - Fingerprint authentication for Android, Windows, and macOS
  - Face ID authentication for iOS and Windows
  - Platform detection and capability checking
  - Secure credential storage with device-based validation
- ✓ Built social login backend integration:
  - Google OAuth with Google Identity Services
  - Apple Sign In with AppleID authentication
  - Facebook Login with Facebook SDK
  - JWT token parsing and user profile extraction
  - Centralized social auth manager with callback handling
- ✓ Created biometric setup page with branded success/error modals
- ✓ Added biometric authentication option to account settings
- ✓ Integrated social login handlers in both signin and signup pages
- ✓ Added environment configuration for social auth credentials (.env.example)
- ✓ PostgreSQL database setup for secure session management