# Brillprime - Financial Solutions Application

## Overview

Brillprime is a full-stack financial services web application built with a modern tech stack. It's designed as a mobile-first Progressive Web App (PWA) that serves two main user types: Drivers and Vendors. The application provides secure authentication, user management, and financial transaction capabilities with a focus on the Nigerian market.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Express.js**: RESTful API server with middleware for logging and error handling
- **Authentication**: Bcrypt for password hashing, OTP-based email verification
- **Data Layer**: Drizzle ORM with PostgreSQL database
- **Storage**: Abstracted storage interface with in-memory implementation for development

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

- **Development**: Vite dev server with HMR and Express API
- **Production**: Static frontend served by Express with API routes
- **Database**: PostgreSQL via Neon Database (serverless)
- **Environment**: Node.js with ES modules
- **Build Process**: 
  - Frontend: Vite builds to `dist/public`
  - Backend: esbuild bundles server to `dist/index.js`

### Key Configuration Files
- `vite.config.ts`: Frontend build configuration with Replit-specific plugins
- `drizzle.config.ts`: Database schema and migration configuration
- `package.json`: Unified scripts for development and production
- `tsconfig.json`: TypeScript configuration for monorepo structure

The application includes PWA capabilities with service worker for offline functionality and app manifest for mobile installation.