/**
 * Memory Cache Library - Main Entry Point
 * High-performance LRU cache with TTL support and comprehensive type definitions
 *
 * @author Alexandre Ducarne
 */

import {
  DEFAULT_CACHE_OPTIONS,
  PRESET_CONFIGURATIONS,
} from "./lib/constants.js";
import { LRUCache } from "./lib/memory-cache.js";
import { CacheOptions } from "./lib/types.js";

// Core cache implementation
export { LRUCache, defaultCache } from "./lib/memory-cache.js";

// Type definitions (for tree-shaking optimization)
export type {
  // Core types
  CacheNode,
  CacheOptions,
  CacheStats,
} from "./lib/types.js";

// Constants and configurations
export {
  // Configuration presets
  DEFAULT_CACHE_OPTIONS,
  PRESET_CONFIGURATIONS,

  // Error messages
  ERROR_MESSAGES,
} from "./lib/constants.js";

// Benchmarking suite (conditionally exported)
export {
  CacheBenchmark,
  runQuickBenchmark,
  runComprehensiveBenchmark,
} from "./lib/memory-cache.benchmark.js";

/**
 * Creates a pre-configured cache instance using preset configurations
 * @param preset - The preset configuration to use
 * @param overrides - Optional configuration overrides
 * @returns Configured LRUCache instance
 */
export function createCache<K = string, V = any>(
  preset?: keyof typeof PRESET_CONFIGURATIONS,
  overrides?: Partial<CacheOptions>,
): LRUCache<K, V> {
  if (!preset) {
    return new LRUCache<K, V>(overrides);
  }

  const presetConfig = PRESET_CONFIGURATIONS[preset];
  const config = { ...presetConfig, ...overrides };

  return new LRUCache<K, V>(config);
}

/**
 * Utility function to create type-safe cache configurations
 * @param options - Cache configuration options
 * @returns Validated cache configuration
 */
export function createCacheConfig(
  options: CacheOptions,
): Required<CacheOptions> {
  return {
    maxSize: options.maxSize ?? DEFAULT_CACHE_OPTIONS.maxSize,
    defaultTtl: options.defaultTtl ?? DEFAULT_CACHE_OPTIONS.defaultTtl,
  };
}
