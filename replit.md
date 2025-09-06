# BrillPrime - Financial Services and Delivery Platform

## Overview

BrillPrime is a comprehensive financial services and delivery platform built for the Nigerian market. It serves as a multi-role ecosystem supporting consumers, merchants, drivers, and administrators with features including fuel delivery, product marketplace, secure payments with escrow, real-time tracking, multi-factor authentication, and advanced identity verification. The platform emphasizes security, compliance, and user experience with real-time communication, automated dispute resolution, and comprehensive admin oversight tools.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript for type safety and better development experience
- **Database**: PostgreSQL with Drizzle ORM for schema management and migrations
- **Authentication**: JWT-based authentication with session management and MFA support
- **Real-time Communication**: WebSocket implementation with Socket.io for live tracking and messaging
- **API Design**: RESTful APIs organized by feature domains (auth, consumer, merchant, driver, admin)

### Frontend Architecture  
- **Framework**: React with TypeScript for component-based UI development
- **Styling**: Tailwind CSS for utility-first styling with custom design system
- **State Management**: React Query (TanStack Query) for server state management
- **UI Components**: Radix UI components for accessible, customizable interface elements
- **Build Tool**: Vite for fast development and optimized production builds

### Security & Compliance
- **Multi-Factor Authentication**: TOTP-based MFA with backup codes and biometric support
- **PCI DSS Compliance**: Secure payment processing with data sanitization and encryption
- **Identity Verification**: Document upload and verification system with ML-based validation
- **Audit Logging**: Comprehensive security event logging and monitoring
- **Rate Limiting**: API protection with Redis-backed rate limiting

### Data Storage
- **Primary Database**: PostgreSQL with optimized indexes for performance
- **Caching**: Redis for session storage, rate limiting, and application caching
- **File Storage**: Integration ready for cloud storage solutions
- **Schema Management**: Drizzle migrations for database version control

### Payment & Financial Services
- **Escrow System**: Secure payment holding with automated and manual release mechanisms
- **Multiple Payment Methods**: Integration with Paystack and other Nigerian payment gateways
- **Wallet Management**: Digital wallet system with transaction history and analytics
- **Fraud Detection**: Suspicious activity monitoring and automated risk assessment

### Delivery & Logistics
- **Real-time Tracking**: GPS-based location tracking for orders and drivers
- **Route Optimization**: Intelligent delivery route planning and toll gate integration
- **Driver Management**: Tiered driver system with performance metrics and ratings
- **Fuel Delivery**: Specialized fuel station integration with inventory management

### Admin & Moderation
- **Multi-role Admin System**: Hierarchical permissions for different admin functions
- **Content Moderation**: Report system with automated and manual review processes
- **Analytics Dashboard**: Real-time metrics and business intelligence reporting
- **Support System**: Integrated ticketing system with escalation workflows

## External Dependencies

### Payment Processing
- **Paystack**: Primary payment gateway for Nigerian market integration
- **Stripe**: International payment processing capability
- Integration architecture supports multiple payment providers

### Communication Services
- **SendGrid**: Email delivery service for notifications and communications
- **Twilio**: SMS and voice communication for verification and alerts
- **WebSocket**: Real-time bidirectional communication for live features

### Cloud Infrastructure
- **PostgreSQL Database**: Cloud-hosted database with SSL connections
- **Redis Cloud**: Distributed caching and session management
- **Environment Configuration**: Support for Replit, Heroku, and other cloud platforms

### Authentication & Security
- **Speakeasy**: Time-based one-time password (TOTP) generation for MFA
- **bcrypt**: Password hashing and security
- **jsonwebtoken**: JWT token management for session authentication

### Development & Deployment
- **Drizzle Kit**: Database migration and schema management
- **TypeScript**: Type safety across the entire application stack
- **ESBuild**: Fast bundling for production deployments
- **Node.js**: Runtime environment optimized for concurrent operations