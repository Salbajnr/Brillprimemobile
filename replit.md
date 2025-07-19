# Brillprime - Financial Solutions Application

## Overview

Brillprime is a full-stack financial services web application built with a modern tech stack. It's designed as a mobile-first Progressive Web App (PWA) that serves two main user types: Drivers and Vendors. The application provides secure authentication, user management, and financial transaction capabilities with a focus on the Nigerian market.

## User Preferences

Preferred communication style: Simple, everyday language.
User roles: Updated to CONSUMER, MERCHANT, DRIVER (instead of DRIVER, VENDOR)
Backend: User has existing backend API - frontend connects to external API endpoints

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
- **External API**: Connects to user's existing backend via REST API endpoints
- **Authentication**: API handles bcrypt password hashing, OTP-based email verification
- **Data Layer**: External backend manages PostgreSQL database with Drizzle ORM
- **Frontend Only**: This implementation serves as frontend client only

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

1. **User Registration**: Client submits user data → Server validates and creates user → OTP generated and stored → User receives verification email
2. **OTP Verification**: Client submits OTP → Server validates against stored code → Account marked as verified
3. **Authentication**: Client submits credentials → Server validates → User session established
4. **Protected Routes**: Client checks authentication state → Redirects to sign-in if unauthorized

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

- **Development**: Vite dev server with HMR serving frontend only
- **Production**: Static frontend served by Express
- **External API**: Connects to user's existing backend API
- **Environment**: Node.js with ES modules
- **Build Process**: 
  - Frontend: Vite builds to `dist/public`
  - Server: Simple Express server serving static files

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