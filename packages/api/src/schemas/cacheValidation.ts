import { body, param } from "express-validator";

/**
 * Validation schema for setting a single cache entry
 * POST /api/cache
 */
export const setCacheValidation = [
  body("key")
    .isString()
    .notEmpty()
    .withMessage("Key must be a non-empty string")
    .isLength({ min: 1, max: 250 })
    .withMessage("Key must be between 1 and 250 characters"),

  body("value").exists().withMessage("Value is required"),

  body("ttl")
    .optional()
    .isInt({ min: 1 })
    .withMessage("TTL must be a positive integer in milliseconds")
    .toInt(),
];

/**
 * Validation schema for updating cache entry
 * PUT /api/cache/:key
 */
export const updateCacheValidation = [
  param("key")
    .isString()
    .notEmpty()
    .withMessage("Key parameter must be a non-empty string")
    .isLength({ min: 1, max: 250 })
    .withMessage("Key must be between 1 and 250 characters"),

  body("value").exists().withMessage("Value is required"),

  body("ttl")
    .optional()
    .isInt({ min: 1 })
    .withMessage("TTL must be a positive integer in milliseconds")
    .toInt(),
];

/**
 * Validation schema for getting cache entry by key
 * GET /api/cache/:key
 */
export const getCacheValidation = [
  param("key")
    .isString()
    .notEmpty()
    .withMessage("Key parameter must be a non-empty string")
    .isLength({ min: 1, max: 250 })
    .withMessage("Key must be between 1 and 250 characters"),
];

/**
 * Validation schema for deleting cache entry by key
 * DELETE /api/cache/:key
 */
export const deleteCacheValidation = [
  param("key")
    .isString()
    .notEmpty()
    .withMessage("Key parameter must be a non-empty string")
    .isLength({ min: 1, max: 250 })
    .withMessage("Key must be between 1 and 250 characters"),
];

/**
 * Validation schema for batch cache operations
 * POST /api/cache/batch
 */
export const batchSetValidation = [
  body("entries")
    .isArray({ min: 1, max: 100 })
    .withMessage("Entries must be an array with 1-100 items"),

  body("entries.*.key")
    .isString()
    .notEmpty()
    .withMessage("Each entry must have a non-empty string key")
    .isLength({ min: 1, max: 250 })
    .withMessage("Each key must be between 1 and 250 characters"),

  body("entries.*.value").exists().withMessage("Each entry must have a value"),

  body("entries.*.ttl")
    .optional()
    .isInt({ min: 1 })
    .withMessage("TTL must be a positive integer in milliseconds")
    .toInt(),
];

/**
 * Validation schema for getting multiple cache entries
 * POST /api/cache/getMultiple
 */
export const batchGetValidation = [
  body("keys")
    .isArray({ min: 1, max: 100 })
    .withMessage("Keys must be an array with 1-100 items"),

  body("keys.*")
    .isString()
    .notEmpty()
    .withMessage("Each key must be a non-empty string")
    .isLength({ min: 1, max: 250 })
    .withMessage("Each key must be between 1 and 250 characters"),
];

/**
 * Validation schema for deleting multiple cache entries
 * DELETE /api/cache/batch
 */
export const batchDeleteValidation = [
  body("keys")
    .isArray({ min: 1, max: 100 })
    .withMessage("Keys must be an array with 1-100 items"),

  body("keys.*")
    .isString()
    .notEmpty()
    .withMessage("Each key must be a non-empty string")
    .isLength({ min: 1, max: 250 })
    .withMessage("Each key must be between 1 and 250 characters"),
];
