
# BrillPrime Render Deployment Guide

## Quick Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Connect to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file

### 3. Environment Variables
The following variables will be auto-configured via `render.yaml`:
- `DATABASE_URL` - Already configured for your Render PostgreSQL
- `JWT_SECRET` - Auto-generated secure value
- `SESSION_SECRET` - Auto-generated secure value
- `NODE_ENV` - Set to production
- `PORT` - Set to 10000 (Render standard)

### 4. Build Process
Render will automatically:
1. Install server dependencies
2. Install client dependencies
3. Build the React frontend
4. Start the production server

### 5. Access Your Application
- **API Base**: `https://brillprime-backend.onrender.com/api`
- **Frontend**: `https://brillprime-backend.onrender.com`
- **Admin Panel**: `https://brillprime-backend.onrender.com/admin`

## Architecture
- **Frontend**: React app served from `/client/dist`
- **Backend**: Node.js/Express API server
- **Database**: Render PostgreSQL (already configured)
- **WebSocket**: Real-time features enabled

## Monitoring
- View logs in Render dashboard
- Monitor performance metrics
- Set up alerts for downtime

## Custom Domain (Optional)
1. Go to Settings in Render dashboard
2. Add your custom domain
3. Configure DNS records as instructed

Your BrillPrime application is now ready for Render deployment! 🚀
