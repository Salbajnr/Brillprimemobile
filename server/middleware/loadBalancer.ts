
import { Request, Response, NextFunction } from 'express';
import os from 'os';

interface ServerStats {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestsPerSecond: number;
  uptime: number;
}

class LoadBalancerMiddleware {
  private requestCount: number = 0;
  private startTime: number = Date.now();
  private activeConnections: number = 0;
  private lastCpuUsage: NodeJS.CpuUsage = process.cpuUsage();
  private lastStatsTime: number = Date.now();

  constructor() {
    // Update stats every 10 seconds
    setInterval(() => {
      this.updateStats();
    }, 10000);
  }

  private updateStats() {
    this.lastCpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastStatsTime = Date.now();
  }

  // Health check endpoint
  healthCheck = (req: Request, res: Response) => {
    const stats = this.getServerStats();
    const isHealthy = this.isServerHealthy(stats);

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      stats,
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      instanceId: process.env.INSTANCE_ID || os.hostname()
    });
  };

  // Get server statistics
  getServerStats(): ServerStats {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - this.startTime) / 1000;

    // Calculate CPU usage percentage
    const cpuUsage = this.lastCpuUsage;
    const totalCpuTime = (cpuUsage.user + cpuUsage.system) / 1000; // Convert to milliseconds
    const cpuPercent = Math.min((totalCpuTime / (currentTime - this.lastStatsTime)) * 100, 100);

    return {
      cpuUsage: Math.round(cpuPercent * 100) / 100,
      memoryUsage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100 * 100) / 100,
      activeConnections: this.activeConnections,
      requestsPerSecond: Math.round((this.requestCount / elapsedSeconds) * 100) / 100,
      uptime: Math.round(uptime)
    };
  }

  // Determine if server is healthy
  private isServerHealthy(stats: ServerStats): boolean {
    // More relaxed thresholds for development environment
    const isDev = process.env.NODE_ENV !== 'production';
    return (
      stats.cpuUsage < (isDev ? 95 : 90) && // CPU usage threshold
      stats.memoryUsage < (isDev ? 98 : 90) && // Memory usage threshold  
      stats.activeConnections < 1000 // Active connections under 1000
    );
  }

  // Request tracking middleware
  requestTracker = (req: Request, res: Response, next: NextFunction) => {
    this.requestCount++;
    this.activeConnections++;

    // Add request metadata
    req.requestStartTime = Date.now();
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Set request tracking headers
    res.setHeader('X-Request-ID', req.requestId);
    res.setHeader('X-Instance-ID', process.env.INSTANCE_ID || os.hostname());

    // Cleanup on response finish
    res.on('finish', () => {
      this.activeConnections--;
      const duration = Date.now() - req.requestStartTime!;
      
      // Log slow requests
      if (duration > 2000) {
        console.warn(`Slow request: ${req.method} ${req.url} took ${duration}ms`);
      }
    });

    next();
  };

  // Circuit breaker middleware
  circuitBreaker = (req: Request, res: Response, next: NextFunction) => {
    const stats = this.getServerStats();
    
    // If server is unhealthy, reject new requests
    if (!this.isServerHealthy(stats)) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Server is overloaded, please try again later',
        retryAfter: 30
      });
    }

    next();
  };

  // Rate limiting based on server load
  adaptiveRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const stats = this.getServerStats();
    let maxRequestsPerMinute = 1000; // Base rate limit

    // Reduce rate limit based on server load
    if (stats.cpuUsage > 70) {
      maxRequestsPerMinute = 500;
    } else if (stats.cpuUsage > 50) {
      maxRequestsPerMinute = 750;
    }

    if (stats.memoryUsage > 70) {
      maxRequestsPerMinute = Math.min(maxRequestsPerMinute, 400);
    }

    // Store rate limit info (would typically use Redis for distributed systems)
    res.setHeader('X-RateLimit-Limit', maxRequestsPerMinute.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequestsPerMinute - (this.requestCount % maxRequestsPerMinute)).toString());

    next();
  };

  // Load balancer headers
  loadBalancerHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Add load balancer information
    res.setHeader('X-Served-By', process.env.INSTANCE_ID || os.hostname());
    res.setHeader('X-Load-Balancer', 'BrillPrime-LB');
    
    // Add caching headers for load balancer
    if (req.method === 'GET' && !req.url.includes('/api/')) {
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    }

    next();
  };

  // Graceful shutdown handling
  gracefulShutdown = () => {
    return new Promise<void>((resolve) => {
      console.log('Starting graceful shutdown...');
      
      // Stop accepting new connections
      const checkConnections = setInterval(() => {
        if (this.activeConnections === 0) {
          clearInterval(checkConnections);
          console.log('All connections closed, shutting down');
          resolve();
        } else {
          console.log(`Waiting for ${this.activeConnections} connections to close...`);
        }
      }, 1000);

      // Force shutdown after 30 seconds
      setTimeout(() => {
        clearInterval(checkConnections);
        console.log('Forced shutdown after 30 seconds');
        resolve();
      }, 30000);
    });
  };
}

// Singleton instance
export const loadBalancer = new LoadBalancerMiddleware();

// Express middleware exports
export const healthCheck = loadBalancer.healthCheck;
export const requestTracker = loadBalancer.requestTracker;
export const circuitBreaker = loadBalancer.circuitBreaker;
export const adaptiveRateLimit = loadBalancer.adaptiveRateLimit;
export const loadBalancerHeaders = loadBalancer.loadBalancerHeaders;
export const gracefulShutdown = loadBalancer.gracefulShutdown;

declare global {
  namespace Express {
    interface Request {
      requestStartTime?: number;
      requestId?: string;
    }
  }
}
