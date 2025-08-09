
import { Router } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";

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
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Frontend Error:', {
        message: errorData.message,
        stack: errorData.stack,
        url: errorData.url,
        timestamp: errorData.timestamp
      });
    }

    // In production, you might want to:
    // 1. Store errors in database
    // 2. Send to error tracking service (Sentry, Bugsnag, etc.)
    // 3. Send alerts for critical errors

    // For now, just acknowledge the error was received
    res.status(200).json({ 
      success: true, 
      message: "Error logged successfully" 
    });

  } catch (error) {
    console.error('Failed to log frontend error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to log error" 
    });
  }
});

export default router;
