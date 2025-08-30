
# BrillPrime Frontend Deployment Guide

## Separate Frontend Deployment on Replit

This guide covers deploying the frontend separately from the backend.

### Architecture
- **Backend**: Deployed on Render (https://brillprime-backend.onrender.com)
- **Frontend**: Deployed on Replit as Static Deployment
- **Communication**: Frontend connects to backend via API calls

### Deployment Steps

#### 1. Prepare Frontend for Deployment
```bash
cd client
npm install
npm run build
```

#### 2. Deploy Frontend on Replit
1. Open the Deployments tab in Replit
2. Select "Static" deployment type
3. Configure:
   - **Build command**: `cd client && npm run build`
   - **Public directory**: `client/dist`
   - **Index page**: `index.html`

#### 3. Environment Configuration
The frontend is configured to connect to:
- **API Base URL**: `https://brillprime-backend.onrender.com/api`
- **WebSocket URL**: `wss://brillprime-backend.onrender.com`

### Features
- ✅ Single Page Application (SPA) routing
- ✅ API calls to separate backend
- ✅ WebSocket connections for real-time features
- ✅ Optimized static asset serving
- ✅ Cache headers for performance

### Monitoring
- Frontend performance via Replit dashboard
- Backend API calls logged on Render
- Real-time features work across domains

### Benefits of Separate Deployment
1. **Independent scaling**: Scale frontend and backend separately
2. **Faster deployments**: Deploy frontend changes without backend rebuild
3. **Resource optimization**: Static frontend uses fewer resources
4. **Better caching**: CDN can cache static assets effectively
5. **Easier maintenance**: Separate concerns and repositories

Your frontend will be accessible at your Replit deployment URL while connecting to the backend on Render.
