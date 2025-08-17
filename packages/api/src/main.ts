import express from "express";
import { LRUCache } from "@memory-cache-server/memory-cache";
import { CacheController } from "./controllers/cacheController.js";
import { createCacheRoutes } from "./routes/cacheRoutes.js";
import {
  corsHandler,
  errorHandler,
  requestLogger,
  simpleRateLimit,
} from "./middleware/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Create application cache instance
const appCache = new LRUCache({
  maxSize: 10000,
  defaultTtl: 10 * 60 * 1000, // 10 minutes default TTL
});

// Create controller instance
const cacheController = new CacheController(appCache);

// Global middleware
app.use(express.json({ limit: "10mb" }));
app.use(requestLogger);
app.use(corsHandler);
app.use(simpleRateLimit(100, 60000)); // 100 requests per minute

// API documentation route
app.get("/", (req, res) => {
  res.json({
    status: "running",
    version: "2.0.0",
    endpoints: {
      "GET /": "API information",
      "GET /api/health": "Health check",
      "GET /api/cache/stats": "Cache statistics",
      "GET /api/cache/keys": "List all cache keys",
      "GET /api/cache/:key": "Get cached value",
      "POST /api/cache": "Set cache value",
      "PUT /api/cache/:key": "Update cache value",
      "DELETE /api/cache/:key": "Delete cache value",
      "DELETE /api/cache": "Clear all cache",
      "POST /api/cache/batch": "Set multiple cache values",
      "POST /api/cache/getMultiple": "Get multiple cache values",
      "DELETE /api/cache/batch": "Delete multiple cache values",
      "POST /api/cache/cleanup": "Cleanup expired entries",
    },
    features: {
      validation: "Express-validator for request validation",
      rateLimit: "100 requests per minute per IP",
      cors: "Cross-origin requests enabled",
      logging: "Request/response logging",
      errorHandling: "Global error handling middleware",
    },
    batchOperations: {
      description: "Efficient batch operations for multiple cache entries",
      examples: {
        setBatch: {
          method: "POST",
          url: "/api/cache/batch",
          body: {
            entries: [
              { key: "user:123", value: { name: "John" }, ttl: 3600000 },
              { key: "user:456", value: { name: "Jane" } },
              { key: "config:app", value: { theme: "dark" }, ttl: 86400000 },
            ],
          },
        },
        getBatch: {
          method: "POST",
          url: "/api/cache/getMultiple",
          body: {
            keys: ["user:123", "user:456", "config:app"],
          },
          description:
            "Get multiple cache values with request body containing array of keys",
        },
        deleteBatch: {
          method: "DELETE",
          url: "/api/cache/batch",
          body: {
            keys: ["user:123", "user:456", "config:app"],
          },
        },
      },
    },
  });
});

// Mount API routes
app.use("/api", createCacheRoutes(cacheController));

// Global error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Memory Cache Server API running on port ${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/`);
  console.log(`💾 Cache configured with max size: 10000 entries`);
  console.log(
    `⏰ Default TTL: ${(appCache.defaultTtl || 600000) / 1000} seconds`,
  );
});
