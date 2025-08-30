
# BrillPrime Frontend Deployment Guide

## Separate Frontend Deployment on Replit

This guide covers deploying the frontend separately from the backend using Replit's Static Deployment feature.

### Architecture Overview
- **Backend**: Deployed on Replit as Web Service (API server)
- **Frontend**: Deployed on Replit as Static Deployment
- **Database**: Render PostgreSQL (shared between deployments)
- **Communication**: Frontend connects to backend via HTTPS API calls and WebSocket

### Deployment Configuration

#### Backend Service (Already Deployed)
- **Type**: Web Service on Replit
- **URL**: Your backend Replit deployment URL
- **Endpoints**: `/api/*` routes
- **WebSocket**: Real-time features enabled
- **Database**: Connected to Render PostgreSQL

#### Frontend Service (Static Deployment)
- **Type**: Static Deployment on Replit
- **Build Process**: React + Vite build system
- **Output**: Optimized static files
- **API Connection**: Points to backend service

### Step-by-Step Deployment

#### 1. Prepare Frontend Configuration
The frontend is already configured to connect to the backend:

```typescript
// client/src/lib/api.ts
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-repl.replit.app/api'
  : 'http://localhost:5000/api';

const WEBSOCKET_URL = process.env.NODE_ENV === 'production'
  ? 'wss://your-backend-repl.replit.app'
  : 'ws://localhost:5000';
```

#### 2. Build Frontend Locally (Test)
```bash
cd client
npm install
npm run build
```

This creates optimized files in `client/dist/` directory.

#### 3. Deploy Frontend on Replit

**Option A: Same Repl (Recommended)**
1. Your backend is already running on this Repl
2. The frontend build files are served from `client/dist/`
3. Backend serves both API and static files
4. Single deployment URL for everything

**Option B: Separate Repl**
1. Create a new Replit project
2. Upload only the `client/` directory
3. Configure Static Deployment:
   - **Build command**: `npm install && npm run build`
   - **Public directory**: `dist`
   - **Index page**: `index.html`
4. Update API URLs to point to your backend Repl

#### 4. Environment Configuration

**Frontend Environment Variables:**
```env
# Production API endpoints
VITE_API_BASE_URL=https://your-backend-repl.replit.app/api
VITE_WEBSOCKET_URL=wss://your-backend-repl.replit.app
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_key_here
```

**Backend Configuration:**
```env
# CORS configuration for frontend
FRONTEND_URL=https://your-frontend-repl.replit.app
CORS_ORIGIN=https://your-frontend-repl.replit.app
```

### Replit Deployment Settings

#### Static Deployment Configuration
```toml
# .replit (for frontend-only deployment)
entrypoint = "index.html"
modules = ["nodejs-20"]

[deployment]
build = ["npm", "install", "&&", "npm", "run", "build"]
publicDir = "dist"
deploymentTarget = "static"

[packager]
language = "nodejs"

[[ports]]
localPort = 3000
externalPort = 80
```

#### Full-Stack Deployment (Current Setup)
```toml
# .replit (backend + frontend)
entrypoint = "server/index.ts"
modules = ["nodejs-20", "postgresql-15"]

[deployment]
run = ["npm", "run", "dev"]
build = ["npm", "install", "--legacy-peer-deps"]
deploymentTarget = "cloudrun"
```

### Features Supported

#### ✅ Frontend Features
- **Single Page Application (SPA)** with React Router
- **Responsive Design** for all device sizes
- **Progressive Web App (PWA)** capabilities
- **Real-time Updates** via WebSocket connections
- **Optimized Assets** with Vite build system
- **API Integration** with backend services

#### ✅ Backend Integration
- **RESTful API calls** for all data operations
- **WebSocket connections** for real-time features
- **Authentication** with secure session management
- **File uploads** for KYC and profile images
- **Payment processing** with Paystack integration

#### ✅ Performance Optimizations
- **Code splitting** for faster loading
- **Lazy loading** of components and routes
- **Asset optimization** (images, CSS, JS)
- **Caching strategies** for API responses
- **Service worker** for offline support

### Monitoring & Analytics

#### Frontend Performance
- **Page load times** via Replit dashboard
- **User interactions** and engagement metrics
- **Error tracking** for client-side issues
- **Bundle size optimization** monitoring

#### Backend Communication
- **API response times** logged on backend
- **WebSocket connection** health monitoring
- **Error rates** for failed requests
- **Real-time feature** performance metrics

### Security Considerations

#### Frontend Security
- **HTTPS enforcement** for all communications
- **Content Security Policy (CSP)** headers
- **XSS protection** through React's built-in security
- **Secure token storage** in localStorage/sessionStorage

#### Cross-Origin Communication
- **CORS configuration** on backend for frontend domain
- **Secure WebSocket** connections (WSS)
- **API key protection** (public keys only in frontend)

### Troubleshooting

#### Common Issues
1. **API calls failing**: Check CORS configuration and API URLs
2. **WebSocket not connecting**: Verify WSS URL and backend WebSocket setup
3. **Build failures**: Ensure all dependencies are installed
4. **Routing issues**: Configure SPA fallback in deployment settings

#### Debug Steps
```bash
# Test API connectivity
curl https://your-backend-repl.replit.app/api/health

# Check frontend build
cd client && npm run build

# Verify environment variables
echo $VITE_API_BASE_URL
```

### Benefits of This Architecture

#### 1. **Scalability**
- Frontend and backend scale independently
- Static frontend can handle high traffic with CDN
- Backend resources focused on API processing

#### 2. **Performance**
- Faster frontend deployments (no backend rebuild)
- Optimized static asset delivery
- Better caching strategies

#### 3. **Maintenance**
- Separate deployment pipelines
- Independent versioning
- Easier debugging and monitoring

#### 4. **Cost Efficiency**
- Static frontend uses minimal resources
- Backend resources optimized for API workload
- Better resource allocation

### Next Steps

1. **Monitor Performance**: Track frontend and backend metrics
2. **Optimize Assets**: Implement lazy loading and code splitting
3. **Add CDN**: Consider CDN for static assets if needed
4. **Scale Backend**: Monitor API performance and scale as needed

Your BrillPrime frontend is now optimally deployed with separate concerns and maximum performance! 🚀
