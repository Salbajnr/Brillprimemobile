
import express from 'express';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// Static asset optimization middleware
export function staticAssetsMiddleware() {
  return express.static(path.join(process.cwd(), 'client/dist'), {
    maxAge: '1y', // Cache static assets for 1 year
    etag: true,
    lastModified: true,
    setHeaders: (res: Response, path: string) => {
      // Set different cache policies based on file type
      if (path.endsWith('.html')) {
        // HTML files should not be cached or cached for a short time
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400');
      } else if (path.match(/\.(js|css)$/)) {
        // JS and CSS files (usually have hash in filename)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
        // Image files
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      } else if (path.match(/\.(woff|woff2|ttf|eot)$/)) {
        // Font files
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Access-Control-Allow-Origin', '*');
      }

      // Security headers for all static files
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
    }
  });
}

// CDN optimization headers
export function cdnHeaders(req: Request, res: Response, next: NextFunction) {
  // Enable compression hint
  res.setHeader('Vary', 'Accept-Encoding');
  
  // Enable CDN caching
  if (req.url.startsWith('/api/public/') || req.url.startsWith('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
  }
  
  // CORS headers for CDN
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  next();
}

// Preload critical resources
export function resourceHints(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/' || req.path.endsWith('.html')) {
    // Preload critical CSS and JS
    res.setHeader('Link', [
      '</assets/css/main.css>; rel=preload; as=style',
      '</assets/js/main.js>; rel=preload; as=script',
      '</assets/fonts/main.woff2>; rel=preload; as=font; type=font/woff2; crossorigin'
    ].join(', '));
  }
  next();
}

// Compression configuration
export const compressionConfig = {
  filter: (req: Request, res: Response) => {
    // Don't compress already compressed files
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Compress text-based content
    return /json|text|javascript|css|xml|svg/.test(res.getHeader('content-type') as string);
  },
  threshold: 1024, // Only compress if larger than 1KB
  level: 6, // Compression level (1-9)
  windowBits: 15,
  memLevel: 8
};

// Asset versioning for cache busting
export function assetVersioning(req: Request, res: Response, next: NextFunction) {
  // Add version parameter to asset URLs
  if (req.url.startsWith('/assets/')) {
    const version = process.env.ASSET_VERSION || Date.now().toString();
    res.setHeader('X-Asset-Version', version);
  }
  next();
}

// Service Worker caching strategy
export function serviceWorkerCache(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/sw.js') {
    // Service worker should not be cached
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
}
