import { NextFunction, Request, Response } from "express";

/**
 * Global error handling middleware
 * This should be the last middleware in the application
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  console.error("API Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Check if response was already sent
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};

/**
 * CORS middleware for cross-origin requests
 */
export const corsHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
};

/**
 * Rate limiting middleware (simple implementation)
 * In production, consider using express-rate-limit
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const simpleRateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || "unknown";
    const now = Date.now();

    let clientData = requestCounts.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      clientData = { count: 0, resetTime: now + windowMs };
      requestCounts.set(clientId, clientData);
    }

    clientData.count++;

    if (clientData.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil((clientData.resetTime - now) / 1000)} seconds.`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};
