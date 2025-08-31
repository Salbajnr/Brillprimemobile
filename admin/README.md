
# BrillPrime Admin Dashboard

Separate admin frontend for BrillPrime platform management.

## Features

- User Management (listing, filtering, bulk actions)
- Admin Authentication with role-based permissions
- Real-time dashboard with system stats
- Support ticket management
- Transaction monitoring
- Escrow management

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Production

The admin dashboard is served at `/admin/*` routes and uses the shared backend API.

## Environment Variables

- `VITE_API_BASE_URL`: Backend API URL
- `VITE_WEBSOCKET_URL`: WebSocket connection URL
