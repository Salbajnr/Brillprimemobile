# Brillprime - Cross-Platform Financial Solutions

## Overview
Brillprime is now a comprehensive cross-platform monorepo supporting iOS, Android, and Web applications with shared business logic, API calls, hooks, and constants. The project provides secure financial transaction capabilities and user management for CONSUMERs, MERCHANTs, and DRIVERs in the Nigerian market. Enhanced as a unified codebase that maximizes code reuse while maintaining platform-specific optimizations.

## User Preferences
- Preferred communication style: Simple, everyday language
- User roles: CONSUMER, MERCHANT, DRIVER, ADMIN
- Architecture: Cross-platform monorepo with shared packages
- Goal: Single codebase for iOS, Android, and Web with maximum code reuse

## System Architecture
Unified full-stack React application adapted for Replit environment from complex monorepo structure.

**Core Technologies:**
- **Frontend**: React SPA with TypeScript, inline CSS/Tailwind, Wouter routing
- **Backend**: Express.js REST API server with Node.js
- **Database**: PostgreSQL with Drizzle ORM (configured)
- **Development**: Single unified codebase optimized for Replit deployment

**Shared Package Architecture:**
- **@packages/shared**: Cross-platform utilities (Platform detection, Storage abstraction, Navigation, Validation, Formatters, Common utilities)
- **@packages/shared-ui**: React Native Web compatible UI components (Button, Card, Badge, Text, View)
- **@packages/business-logic**: Shared hooks and business logic (useMonorepoStats, build utilities)
- **@packages/api-client**: Unified API client for all platforms with error handling and retry logic
- **@packages/constants**: Shared configuration, colors, and build constants

**Platform Configuration:**
- **Vite (Web)**: Configured with path aliases for shared packages
- **Metro (React Native)**: Configured to resolve shared packages across monorepo
- **TypeScript**: Project references for proper type checking across packages

**Cross-Platform Features:**
- **Platform Detection**: Automatic detection of web vs native environment
- **Unified Storage**: localStorage on web, AsyncStorage on React Native
- **Shared Validation**: Email, password, phone number validation across platforms
- **Consistent Formatting**: Currency, date, time formatting with locale support
- **React Native Web Compatibility**: UI components work seamlessly on both platforms
- **Type Safety**: Full TypeScript support with shared type definitions

**Development Workflow:**
- **Enhanced Existing Apps**: Original web and React Native apps now use shared packages
- **Cross-Platform Utilities**: Platform detection, storage, validation, and formatting
- **Shared UI Components**: React Native Web compatible components with consistent styling
- **Unified API Client**: Single API client with platform-specific headers and error handling
- **Type Safety**: Full TypeScript integration across all platforms with shared type definitions
- **Build System**: Enhanced Metro and Vite configurations for shared package resolution

**Migration Status:**
- ✅ Monorepo structure simplified to unified app
- ✅ Express server with working API endpoints
- ✅ React frontend with proper routing and splash screen
- ✅ Tailwind CSS integration via CDN
- ✅ User flow: Splash → Onboarding → Role Selection → Dashboard
- ✅ Clean project structure optimized for Replit
- ✅ Splash screen implemented as entry point (3-second timer)
- ✅ Complete flow matching design specifications
- ✅ Redundant files cleaned up and removed

## External Dependencies

**Core Libraries:**
- **Mapping**: Google Maps Static API.
- **Social Authentication**: Google Identity Services, AppleID authentication, Facebook SDK.