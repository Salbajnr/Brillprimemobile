# BrillPrime Replit Deployment Documentation

## Overview

BrillPrime is a comprehensive platform revolutionizing delivery and financial services in Nigeria. It offers a robust and scalable solution for order management, real-time tracking, secure payments, and user authentication, catering to consumers, drivers, and merchants. The project's vision is to provide a high-performance, secure, and reliable system capable of meeting the dynamic demands of the Nigerian market.

## User Preferences

I prefer clear, concise explanations and direct answers. My working style is iterative, so propose changes incrementally and explain the rationale behind significant modifications. I value well-structured code and prefer functional programming paradigms where applicable. Do not make changes to the `client/` directory unless explicitly instructed, as it handles the frontend.

## System Architecture

BrillPrime employs a separate frontend/backend deployment strategy for optimal performance, scalability, and maintainability.

### UI/UX Decisions
The frontend is built as a React 18 Single Page Application (SPA) with TypeScript and Vite, ensuring a responsive design and PWA (Progressive Web App) support for a seamless user experience.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite for an optimized build and code splitting. Deployed as static files.
- **Backend**: Node.js with Express and TypeScript, serving as a RESTful API server with WebSocket capabilities for real-time communication.
- **Authentication**: Multi-Factor Authentication (SMS, Email, TOTP), Social Login (Google, Apple, Facebook), secure session management with JWT fallback, Role-Based Access Control (Consumer, Driver, Merchant, Admin), and Biometric Support.
- **Real-Time Features**: WebSocket for live updates (orders, chat, tracking), live chat system, GPS-based real-time delivery tracking, push notifications, and real-time driver location.
- **Payment Integration**: Paystack integration (cards, bank transfers, USSD), digital wallet, escrow system, QR payments, and real-time money transfers.
- **Business Logic**: Comprehensive order lifecycle management, merchant inventory system, driver assignment and route optimization, KYC verification, and ticket-based support system.

### System Design Choices
- **Separation of Concerns**: Independent scaling of frontend and backend services, allowing faster deployments and resource optimization.
- **Performance Optimizations**: Optimized static asset delivery, API-only backend, code splitting, lazy loading, database connection pooling, and query optimization with indexing.
- **Security**: Implementation of `helmet`, `cors`, rate limiting, secure session management, input validation, and SQL injection prevention.
- **Real-Time System**: Server-side WebSocket management with event handling for broadcasting updates (e.g., `order_status_updated`, `new_message`, `driver_location_updated`).
- **Mobile Integration**: Shared API client for web and mobile (React Native compatibility) to leverage native features like location tracking.
- **Monitoring & Analytics**: Health check endpoints, performance analytics collection (page views, user actions), and system health monitoring (uptime, memory, database, Redis, WebSocket).

## External Dependencies

- **Database**: Render PostgreSQL (managed database service)
- **Payment Gateway**: Paystack
- **Social Login Providers**: Google, Apple, Facebook
- **Real-time Communication**: Socket.IO (for WebSockets)
- **Caching**: Redis (optional, memory cache fallback)
- **Replit Deployment**: Cloudrun for backend, Static for frontend