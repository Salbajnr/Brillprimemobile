import { Router } from "express";
import { db } from "../db.js";
import { eq } from "drizzle-orm";
import { errorLogs } from "../db.js";

const router = Router();

interface ErrorLogData {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: number;
}

router.post("/log-error", async (req, res) => {
  try {
    const errorData: ErrorLogData = req.body;
    const { loggingService } = await import('../services/logging');
    
    loggingService.default.error('Frontend Error', new Error(errorData.message), {
      userId: errorData.userId,
      userAgent: errorData.userAgent,
      metadata: {
        source: 'frontend',
        url: errorData.url,
        componentStack: errorData.componentStack,
        timestamp: errorData.timestamp,
        stack: errorData.stack,
        userAgent: errorData.userAgent,
        sessionId: req.sessionID,
        ip: req.ip || req.connection.remoteAddress
      }
    });

    // Store critical errors in database for tracking
    if (errorData.message.toLowerCase().includes('critical') || 
        errorData.message.toLowerCase().includes('payment') ||
        errorData.message.toLowerCase().includes('security')) {
      
      try {
        await db.insert(errorLogs).values({
          message: errorData.message,
          stack: errorData.stack,
          url: errorData.url,
          userAgent: errorData.userAgent,
          userId: errorData.userId,
          severity: 'CRITICAL',
          source: 'frontend',
          timestamp: new Date(errorData.timestamp),
          metadata: JSON.stringify({
            componentStack: errorData.componentStack,
            sessionId: req.sessionID,
            ip: req.ip || req.connection.remoteAddress
          })
        });
      } catch (dbError) {
        loggingService.error('Failed to store error in database', dbError as Error, {
          originalError: errorData.message
        });
      }
    }

    // Send alerts for critical errors
    if (process.env.NODE_ENV === 'production' && 
        (errorData.message.toLowerCase().includes('payment') ||
         errorData.message.toLowerCase().includes('security'))) {
      
      // Here you could integrate with alerting services
      loggingService.logSecurity({
        event: 'SUSPICIOUS_ACTIVITY',
        userId: errorData.userId,
        ip: req.ip || req.connection.remoteAddress || '',
        userAgent: errorData.userAgent,
        details: {
          type: 'CRITICAL_FRONTEND_ERROR',
          error: errorData.message,
          url: errorData.url
        }
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Error logged successfully",
      errorId: `fe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

  } catch (error) {
    const { loggingService } = await import('../services/logging');
    loggingService.error('Failed to log frontend error', error as Error, {
      originalErrorData: req.body
    });
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to log error" 
    });
  }
});

export default router;