import { Request, Response } from "express";
import { LRUCache } from "@memory-cache-server/memory-cache";
import { sendCreated, sendError, sendNotFound, sendSuccess } from "../utils/responseUtils.js";
import {
  BatchDeleteRequest,
  BatchGetRequest,
  BatchOperationResult,
  BatchSetRequest,
  CacheKeysResponse,
  CacheSetRequest,
  CacheStats,
  CacheUpdateRequest,
  HealthResponse
} from "../types/cache.js";

/**
 * Cache controller handles all cache-related operations
 */
export class CacheController {
  constructor(private cache: LRUCache) {}

  /**
   * Health check endpoint
   */
  health = (_req: Request, res: Response): void => {
    try {
      const stats = this.cache.getStats();
      const healthData: HealthResponse = {
        status: "healthy",
        uptime: process.uptime(),
        cache: {
          size: stats.size,
          hitRate: stats.hitRate,
          status: "operational",
        },
        timestamp: new Date().toISOString(),
      };
      res.json(healthData);
    } catch (error) {
      sendError(res, "Health check failed", 500);
    }
  };

  /**
   * Get cache statistics
   */
  getStats = (_req: Request, res: Response): void => {
    try {
      const stats: CacheStats = this.cache.getStats();
      sendSuccess(res, stats);
    } catch (error) {
      sendError(res, "Failed to retrieve cache statistics");
    }
  };

  /**
   * Get all cache keys
   */
  getKeys = (_req: Request, res: Response): void => {
    try {
      const keys = this.cache.keys();
      const data: CacheKeysResponse = {
        keys,
        count: keys.length,
      };
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, "Failed to retrieve cache keys");
    }
  };

  /**
   * Get cached value by key
   */
  get = (req: Request, res: Response): void => {
    try {
      const { key } = req.params;
      const value = this.cache.get(key);

      if (value === undefined) {
        sendNotFound(res, "Key", key);
        return;
      }

      sendSuccess(res, { key, value });
    } catch (error) {
      sendError(res, "Failed to retrieve cached value");
    }
  };

  /**
   * Set cache value with optional TTL
   */
  set = (req: Request, res: Response): void => {
    try {
      const { key, value, ttl }: CacheSetRequest = req.body;
      const success = this.cache.set(key, value, ttl);

      if (success) {
        sendCreated(res, {
          key,
          value,
          ttl: ttl || this.cache.defaultTtl,
        });
      } else {
        sendError(res, "Failed to cache value");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendError(res, "Failed to process cache request", 500, { message });
    }
  };

  /**
   * Update existing cache value
   */
  update = (req: Request, res: Response): void => {
    try {
      const { key } = req.params;
      const { value, ttl }: CacheUpdateRequest = req.body;

      // Check if key exists
      if (!this.cache.has(key)) {
        sendNotFound(res, "Key", key);
        return;
      }

      const success = this.cache.set(key, value, ttl);

      if (success) {
        sendSuccess(res, {
          key,
          value,
          ttl: ttl || this.cache.defaultTtl,
          updated: true,
        });
      } else {
        sendError(res, "Failed to update cache value");
      }
    } catch (error) {
      sendError(res, "Failed to update cached value");
    }
  };

  /**
   * Delete cached value by key
   */
  delete = (req: Request, res: Response): void => {
    try {
      const { key } = req.params;
      const deleted = this.cache.delete(key);

      if (deleted) {
        sendSuccess(res, { key, deleted: true });
      } else {
        sendNotFound(res, "Key", key);
      }
    } catch (error) {
      sendError(res, "Failed to delete cached value");
    }
  };

  /**
   * Clear all cached values
   */
  clear = (_req: Request, res: Response): void => {
    try {
      this.cache.clear();
      sendSuccess(res, {
        cleared: true,
        message: "All cache entries have been cleared",
      });
    } catch (error) {
      sendError(res, "Failed to clear cache");
    }
  };

  /**
   * Set multiple cache values at once
   */
  batchSet = (req: Request, res: Response): void => {
    try {
      const { entries }: BatchSetRequest = req.body;
      const result: BatchOperationResult = this.cache.setMultiple(entries);

      sendCreated(res, {
        ...result,
        message: `Processed ${result.total} entries: ${result.success.length} successful, ${result.failed.length} failed`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendError(res, "Failed to process batch set operation", 500, { message });
    }
  };

  /**
   * Get multiple cache values by keys
   */
  batchGet = (req: Request, res: Response): void => {
    try {
      const { keys }: BatchGetRequest = req.body;
      const result = this.cache.getMultiple(keys);

      sendSuccess(res, {
        total: keys.length,
        found: Object.keys(result.found).length,
        missing: result.notFound.length,
        data: result.found,
        missingKeys: result.notFound,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendError(res, "Failed to process batch get operation", 500, { message });
    }
  };

  /**
   * Delete multiple cache values by keys
   */
  batchDelete = (req: Request, res: Response): void => {
    try {
      const { keys }: BatchDeleteRequest = req.body;
      const result = this.cache.deleteMultiple(keys);

      sendSuccess(res, {
        total: keys.length,
        deleted: result.deleted.length,
        notFound: result.notFound.length,
        deletedKeys: result.deleted,
        notFoundKeys: result.notFound,
        message: `Deleted ${result.deleted.length} out of ${keys.length} keys`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendError(res, "Failed to process batch delete operation", 500, {
        message,
      });
    }
  };

  /**
   * Cleanup expired entries
   */
  cleanup = (_req: Request, res: Response): void => {
    try {
      const cleanedCount = this.cache.cleanup();
      sendSuccess(res, {
        cleaned: true,
        entriesRemoved: cleanedCount,
        message: `Cleaned up ${cleanedCount} expired entries`,
      });
    } catch (error) {
      sendError(res, "Failed to cleanup expired entries");
    }
  };
}
