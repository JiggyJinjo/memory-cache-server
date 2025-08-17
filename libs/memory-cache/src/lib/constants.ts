/**
 * Constants and default configurations for Memory Cache Library
 * Provides centralized configuration management and library metadata
 *
 * @author Alexandre Ducarne
 */

import type { CacheOptions } from "./types.js";

/**
 * Default cache configuration values
 */
export const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
  maxSize: 1000,
  defaultTtl: undefined as any, // Will be undefined, but typed as required for defaults
} as const;

/**
 * Performance-optimized configurations for different use cases
 * Note: These contain extended options that will be filtered to CacheOptions when used
 */
export const PRESET_CONFIGURATIONS = {
  /**
   * Optimized for high-frequency API responses
   */
  API_CACHE: {
    maxSize: 10000,
    defaultTtl: 15 * 60 * 1000, // 15 minutes
  } satisfies CacheOptions,

  /**
   * Optimized for user session storage
   */
  SESSION_CACHE: {
    maxSize: 5000,
    defaultTtl: 30 * 60 * 1000, // 30 minutes
  } satisfies CacheOptions,

  /**
   * Optimized for database query results
   */
  DATABASE_CACHE: {
    maxSize: 2000,
    defaultTtl: 5 * 60 * 1000, // 5 minutes
  } satisfies CacheOptions,

  /**
   * High-performance configuration for intensive workloads
   */
  HIGH_PERFORMANCE: {
    maxSize: 50000,
    defaultTtl: 60 * 60 * 1000, // 1 hour
  } satisfies CacheOptions,

  /**
   * Memory-conservative configuration for limited environments
   */
  MEMORY_CONSERVATIVE: {
    maxSize: 500,
    defaultTtl: 2 * 60 * 1000, // 2 minutes
  } satisfies CacheOptions,

  /**
   * Development/testing configuration
   */
  DEVELOPMENT: {
    maxSize: 100,
    defaultTtl: 30 * 1000, // 30 seconds
  } satisfies CacheOptions,
} as const;

/**
 * Error messages for consistent error handling
 */
export const ERROR_MESSAGES = {
  INVALID_MAX_SIZE: "maxSize must be greater than 0",
  INVALID_TTL: "TTL must be a positive number or undefined",
  INVALID_KEY: "Cache key cannot be null or undefined",
  CACHE_FULL: "Cache has reached maximum capacity",
  EXPIRED_ENTRY: "Cache entry has expired",
  SERIALIZATION_FAILED: "Failed to serialize cache entry",
  DESERIALIZATION_FAILED: "Failed to deserialize cache entry",
} as const;
