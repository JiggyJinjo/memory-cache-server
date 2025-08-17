import express from "express";
import { LRUCache } from "@memory-cache-server/memory-cache";

const app = express();
const PORT = process.env.PORT || 3000;

// Create application cache instance
const appCache = new LRUCache({
  maxSize: 10000,
  defaultTtl: 10 * 60 * 1000, // 10 minutes default TTL
});

// Middleware
app.use(express.json({ limit: "10mb" }));

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("API Error:", err.message);
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  },
);

// Routes
app.get("/", (req, res) => {
  res.json({
    status: "running",
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
      "GET /api/cache/batch": "Get multiple cache values",
      "DELETE /api/cache/batch": "Delete multiple cache values",
      "POST /api/cache/cleanup": "Cleanup expired entries",
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
          method: "GET",
          url: "/api/cache/batch?keys=user:123,user:456,config:app",
          description: "Comma-separated keys in query parameter",
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

/**
 * Health check endpoint
 */
app.get("/api/health", (_, res) => {
  const stats = appCache.getStats();
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    cache: {
      size: stats.size,
      hitRate: stats.hitRate,
      status: "operational",
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get cache statistics
 */
app.get("/api/cache/stats", (_, res) => {
  try {
    const stats = appCache.getStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve cache statistics",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get all cache keys
 */
app.get("/api/cache/keys", (_, res) => {
  try {
    const keys = appCache.keys();
    res.json({
      success: true,
      data: {
        keys,
        count: keys.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve cache keys",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get cached value by key
 */
app.get("/api/cache/:key", (req, res) => {
  try {
    const { key } = req.params;
    const value = appCache.get(key);

    if (value === undefined) {
      return res.status(404).json({
        success: false,
        error: "Key not found or expired",
        key,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: {
        key,
        value,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve cached value",
      key: req.params.key,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Set cache value with optional TTL
 * Body: { key: string, value: any, ttl?: number }
 */
app.post("/api/cache", (req, res) => {
  try {
    const { key, value, ttl } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: "Key is required",
        timestamp: new Date().toISOString(),
      });
    }

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: "Value is required",
        timestamp: new Date().toISOString(),
      });
    }

    const success = appCache.set(key, value, ttl);

    if (success) {
      return res.status(201).json({
        success: true,
        data: {
          key,
          value,
          ttl: ttl || appCache.defaultTtl,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Failed to cache value",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to process cache request",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Update existing cache value
 * Body: { value: any, ttl?: number }
 */
app.put("/api/cache/:key", (req, res) => {
  try {
    const { key } = req.params;
    const { value, ttl } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: "Value is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if key exists
    if (!appCache.has(key)) {
      return res.status(404).json({
        success: false,
        error: "Key not found",
        key,
        timestamp: new Date().toISOString(),
      });
    }

    const success = appCache.set(key, value, ttl);

    if (success) {
      return res.json({
        success: true,
        data: {
          key,
          value,
          ttl: ttl || appCache.defaultTtl,
          updated: true,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Failed to update cache value",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to update cached value",
      key: req.params.key,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Delete cached value by key
 */
app.delete("/api/cache/:key", (req, res) => {
  try {
    const { key } = req.params;
    const deleted = appCache.delete(key);

    if (deleted) {
      res.json({
        success: true,
        data: {
          key,
          deleted: true,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Key not found",
        key,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete cached value",
      key: req.params.key,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Clear all cached values
 */
app.delete("/api/cache", (_, res) => {
  try {
    appCache.clear();
    res.json({
      success: true,
      data: {
        cleared: true,
        message: "All cache entries have been cleared",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to clear cache",
      timestamp: new Date().toISOString(),
    });
  }
});

// Batch Operations

/**
 * Set multiple cache values at once
 * Body: { entries: Array<{ key: string, value: any, ttl?: number }> }
 */
app.post("/api/cache/batch", (req, res) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries)) {
      return res.status(400).json({
        success: false,
        error: "Entries must be an array",
        timestamp: new Date().toISOString(),
      });
    }

    if (entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one entry is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate entries structure
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.key) {
        return res.status(400).json({
          success: false,
          error: `Entry at index ${i} is missing key`,
          timestamp: new Date().toISOString(),
        });
      }
      if (entry.value === undefined) {
        return res.status(400).json({
          success: false,
          error: `Entry at index ${i} is missing value`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const result = appCache.setMultiple(entries);

    return res.status(201).json({
      success: true,
      data: {
        ...result,
        message: `Processed ${result.total} entries: ${result.success.length} successful, ${result.failed.length} failed`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to process batch set request",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get multiple cache values at once
 * Body: { keys: string[] }
 */
app.get("/api/cache/batch", (req, res) => {
  try {
    const keysParam = req.query.keys;
    let keys: string[];

    if (typeof keysParam === "string") {
      // Handle single key or comma-separated keys
      keys = keysParam
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    } else if (Array.isArray(keysParam)) {
      // Handle array of keys - filter and cast to string[]
      keys = keysParam.filter(
        (k): k is string => typeof k === "string" && k.length > 0,
      );
    } else {
      return res.status(400).json({
        success: false,
        error:
          "Keys parameter is required (as query parameter: ?keys=key1,key2,key3)",
        timestamp: new Date().toISOString(),
      });
    }

    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one key is required",
        timestamp: new Date().toISOString(),
      });
    }

    const result = appCache.getMultiple(keys);

    return res.json({
      success: true,
      data: {
        ...result,
        message: `Retrieved ${result.found.length} of ${result.total} requested keys`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to process batch get request",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Delete multiple cache values at once
 * Body: { keys: string[] }
 */
app.delete("/api/cache/batch", (req, res) => {
  try {
    const { keys } = req.body;

    if (!Array.isArray(keys)) {
      return res.status(400).json({
        success: false,
        error: "Keys must be an array",
        timestamp: new Date().toISOString(),
      });
    }

    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one key is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate keys are strings
    for (let i = 0; i < keys.length; i++) {
      if (typeof keys[i] !== "string" || keys[i].length === 0) {
        return res.status(400).json({
          success: false,
          error: `Key at index ${i} must be a non-empty string`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const result = appCache.deleteMultiple(keys);

    return res.json({
      success: true,
      data: {
        ...result,
        message: `Deleted ${result.deleted.length} of ${result.total} requested keys`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to process batch delete request",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Cleanup expired entries (maintenance endpoint)
 */
app.post("/api/cache/cleanup", (req, res) => {
  try {
    const removed = appCache.cleanup();
    res.json({
      success: true,
      data: {
        entriesRemoved: removed,
        message: `Cleaned up ${removed} expired entries`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to cleanup cache",
      timestamp: new Date().toISOString(),
    });
  }
});

// Start server
app.listen(PORT, () => {
  const stats = appCache.getStats();
  console.log(`🚀 Memory Cache Server running on http://localhost:${PORT}`);
  console.log(`📊 Cache initialized: maxSize=${stats.maxSize}, TTL=10min`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});
