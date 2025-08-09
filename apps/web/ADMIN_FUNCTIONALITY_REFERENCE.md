
# Admin Functionality Reference

This document serves as a reference for the admin functionality that was previously in the `apps/admin` directory but has been consolidated under `apps/web` with `/admin` routes.

## Admin System Overview

The admin system provides comprehensive oversight and management capabilities for the BrillPrime platform, accessible at `brillprime.com/admin` with restricted access for authorized users only.

### Authentication & Access Control

**Admin Protected Routes**: All admin routes are protected by `AdminProtectedRoute` component which verifies:
- User authentication status
- Admin role permissions
- Session validity

**Authentication Flow**:
1. Admin attempts to access `/admin/*` route
2. `AdminProtectedRoute` checks authentication
3. If not authenticated, redirects to admin login
4. If authenticated but not admin, shows access denied
5. If valid admin, renders requested admin component

### Admin Dashboard Structure

#### Main Dashboard (`/admin`)
- **File**: `apps/web/src/pages/admin-dashboard.tsx`
- **Component**: Uses `AdminDashboardMain` for overview metrics
- **Features**:
  - Real-time system metrics
  - Quick access navigation
  - Alert summaries
  - Performance indicators

#### User Management (`/admin/users`)
- **File**: `apps/web/src/pages/admin-user-management.tsx`
- **Features**:
  - User search and filtering
  - Account status management
  - Role assignments
  - User detail modal with comprehensive info
  - Bulk user operations

#### KYC Verification (`/admin/kyc`)
- **File**: `apps/web/src/pages/admin-kyc-verification.tsx`
- **Features**:
  - Document review interface
  - Batch KYC processing
  - Document viewer with zoom/annotations
  - Approval/rejection workflows
  - KYC status tracking

#### Transaction Management (`/admin/transactions`)
- **File**: `apps/web/src/pages/admin-transactions.tsx`
- **Features**:
  - Transaction monitoring
  - Refund processing
  - Transaction detail modal
  - Financial reporting
  - Payment method analysis

#### Fraud Detection (`/admin/fraud`)
- **File**: `apps/web/src/pages/admin-fraud.tsx`
- **Features**:
  - Suspicious activity alerts
  - Pattern recognition
  - Risk assessment tools
  - Fraud investigation workflows
  - Account flagging system

#### Support Management (`/admin/support`)
- **File**: `apps/web/src/pages/admin-support.tsx`
- **Features**:
  - Support ticket queue
  - Customer communication
  - Issue categorization
  - Response templates
  - Escalation management

#### System Monitoring (`/admin/monitoring`)
- **File**: `apps/web/src/pages/admin-monitoring.tsx`
- **Features**:
  - Real-time system health
  - Performance metrics
  - Server status monitoring
  - Database performance
  - API endpoint health

#### Real-Time Dashboard (`/admin/real-time`)
- **File**: `apps/web/src/pages/admin-real-time-dashboard.tsx`
- **Features**:
  - Live activity monitoring
  - WebSocket connection status
  - Real-time alerts
  - System performance graphs
  - User activity streams

#### Escrow Management (`/admin/escrow`)
- **File**: `apps/web/src/pages/admin-escrow-management.tsx`
- **Features**:
  - Escrow transaction oversight
  - Dispute resolution
  - Fund release management
  - Escrow account monitoring
  - Payment reconciliation

#### Content Moderation (`/admin/moderation`)
- **File**: `apps/web/src/pages/admin-moderation.tsx`
- **Features**:
  - Content review queue
  - User-reported content
  - Automated flagging system
  - Content approval workflows
  - Community guidelines enforcement

### Shared Admin Components

#### AdminLayout
- **File**: `apps/web/src/components/admin-layout.tsx`
- **Purpose**: Provides consistent layout for all admin pages
- **Features**:
  - Navigation sidebar
  - Admin user info display
  - Logout functionality
  - Responsive design

#### Admin Login
- **File**: `apps/web/src/components/admin-login.tsx`
- **Purpose**: Dedicated admin authentication interface
- **Features**:
  - Secure login form
  - Admin-specific validation
  - Session management
  - Multi-factor authentication support

#### Modal Components
- `KycReviewModal`: Document review interface
- `UserDetailModal`: Comprehensive user information
- `TransactionDetailModal`: Detailed transaction view
- `RefundProcessingModal`: Refund workflow interface

### Admin Authentication System

#### Admin Auth Context
- **File**: `apps/web/src/lib/admin-auth.tsx`
- **Features**:
  - Admin session management
  - Role-based permissions
  - Authentication state
  - Auto-logout on inactivity

#### Backend Authentication
- **File**: `server/middleware/adminAuth.ts`
- **Features**:
  - JWT token validation
  - Admin role verification
  - Session security
  - Request authorization

### Real-Time Features

#### WebSocket Integration
- **File**: `apps/web/src/hooks/use-websocket.ts`
- **Admin Channels**:
  - `admin_notifications`
  - `admin_monitoring`
  - `admin_alerts`
  - `system_health`

#### Live Monitoring
- **File**: `apps/web/src/components/live-activity-monitor.tsx`
- **Features**:
  - Real-time user activity
  - System performance metrics
  - Live transaction monitoring
  - Alert notifications

### Backend Admin Routes

#### Admin Oversight
- **File**: `server/routes/admin-oversight.ts`
- **Endpoints**:
  - `/api/admin/users`
  - `/api/admin/transactions`
  - `/api/admin/fraud-alerts`
  - `/api/admin/system-metrics`

#### Merchant KYC Management
- **File**: `server/routes/admin-merchant-kyc.ts`
- **Endpoints**:
  - `/api/admin/merchant-kyc/pending`
  - `/api/admin/merchant-kyc/:id/review`
  - `/api/admin/merchant-kyc/:id/documents`

### Security Features

1. **Role-Based Access**: Multi-level admin permissions
2. **Session Security**: Encrypted sessions with timeout
3. **Audit Logging**: All admin actions logged
4. **IP Restrictions**: Optional IP whitelisting
5. **Multi-Factor Auth**: Additional security layer

### Admin Workflow Examples

#### KYC Document Review
1. Admin navigates to `/admin/kyc`
2. Selects pending document
3. Opens `KycReviewModal`
4. Reviews documents with zoom/annotation
5. Approves/rejects with notes
6. System sends notification to user

#### Transaction Dispute Resolution
1. Alert appears in `/admin/fraud`
2. Admin opens `TransactionDetailModal`
3. Reviews transaction history
4. Communicates with involved parties
5. Makes resolution decision
6. Processes refund if necessary

#### User Account Management
1. Search user in `/admin/users`
2. Open `UserDetailModal`
3. Review user history and flags
4. Update account status/roles
5. Add admin notes
6. System logs changes

## Removed Files Documentation

The following files were removed from `apps/admin/` as they are now consolidated under `apps/web/`:

### Pages Removed:
- `admin-dashboard.tsx` → Moved to `apps/web/src/pages/admin-dashboard.tsx`
- `admin-user-management.tsx` → Integrated in web app
- `admin-kyc-verification.tsx` → Consolidated with web version
- `admin-transactions.tsx` → Merged with web admin routes
- `admin-fraud.tsx` → Part of web admin system
- `admin-support.tsx` → Integrated in main web app
- `admin-monitoring.tsx` → Real-time monitoring in web
- `admin-escrow-management.tsx` → Escrow management in web
- `admin-moderation.tsx` → Content moderation in web

### Components Removed:
- `admin-layout.tsx` → Moved to web components
- `admin-login.tsx` → Consolidated in web
- `admin-dashboard-main.tsx` → Part of web admin
- `kyc-review-modal.tsx` → Shared component in web
- `user-detail-modal.tsx` → Web admin component
- `transaction-detail-modal.tsx` → Web transaction management
- `refund-processing-modal.tsx` → Web refund system
- `live-activity-monitor.tsx` → Real-time monitoring in web
- `batch-kyc-actions.tsx` → Batch operations in web

### Configuration Files Removed:
- `package.json` → Admin dependencies merged with web
- `vite.config.ts` → Using web build configuration
- `tailwind.config.js` → Shared styling configuration
- `tsconfig.json` → TypeScript config consolidated

## Migration Notes

1. **Route Changes**: All admin routes now use `/admin/*` prefix in web app
2. **Authentication**: Single authentication system for both web and admin
3. **Shared Components**: Admin components available in web component library
4. **State Management**: Admin state integrated with main application state
5. **WebSocket**: Single WebSocket connection handles both user and admin features

## Future Enhancements

1. **Advanced Analytics**: Enhanced reporting dashboards
2. **Automated Workflows**: AI-powered admin task automation
3. **Mobile Admin**: Responsive admin interface for mobile devices
4. **API Documentation**: Comprehensive admin API documentation
5. **Audit Trail**: Enhanced logging and audit capabilities
