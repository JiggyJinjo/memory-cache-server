import { Router } from "express";
import { validationResult } from "express-validator";
import { CacheController } from "../controllers/cacheController.js";
import { sendValidationError } from "../utils/responseUtils.js";
import {
  batchDeleteValidation,
  batchGetValidation,
  batchSetValidation,
  deleteCacheValidation,
  getCacheValidation,
  setCacheValidation,
  updateCacheValidation
} from "../schemas/cacheValidation.js";

/**
 * Middleware to handle validation errors
 */
const handleValidation = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    sendValidationError(res, errorMessages);
    return;
  }
  next();
};

/**
 * Create cache routes with the provided cache controller
 * @param cacheController Instance of CacheController
 * @returns Express Router with cache routes
 */
export const createCacheRoutes = (cacheController: CacheController): Router => {
  const router = Router();

  // Health and stats routes
  router.get("/health", cacheController.health);
  router.get("/cache/stats", cacheController.getStats);
  router.get("/cache/keys", cacheController.getKeys);

  // Single cache operations
  router.get(
    "/cache/:key",
    getCacheValidation,
    handleValidation,
    cacheController.get,
  );
  router.post(
    "/cache",
    setCacheValidation,
    handleValidation,
    cacheController.set,
  );
  router.put(
    "/cache/:key",
    updateCacheValidation,
    handleValidation,
    cacheController.update,
  );
  router.delete(
    "/cache/deleteMultiple",
    batchDeleteValidation,
    handleValidation,
    cacheController.batchDelete,
  );
  router.delete(
    "/cache/:key",
    deleteCacheValidation,
    handleValidation,
    cacheController.delete,
  );
  router.delete("/cache", cacheController.clear);

  // Batch operations
  router.post(
    "/cache/batch",
    batchSetValidation,
    handleValidation,
    cacheController.batchSet,
  );
  router.post(
    "/cache/getMultiple",
    batchGetValidation,
    handleValidation,
    cacheController.batchGet,
  );

  // Utility operations
  router.post("/cache/cleanup", cacheController.cleanup);

  return router;
};
