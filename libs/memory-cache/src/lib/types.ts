/**
 * Type definitions for Memory Cache Library
 * Provides comprehensive type support with tree-shaking optimization
 *
 * @author Alexandre Ducarne
 */

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Maximum number of items in cache */
  maxSize?: number;
  /** Default TTL in milliseconds */
  defaultTtl?: number;
}

/**
 * Cache node interface for internal use
 * @template K - Key type
 * @template V - Value type
 */
export interface CacheNode<K, V> {
  key: K;
  value: V;
  prev: CacheNode<K, V> | null;
  next: CacheNode<K, V> | null;
  expiresAt?: number;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
}

/**
 * Entry for batch set operations
 * @template K - Key type
 * @template V - Value type
 */
export interface BatchSetEntry<K, V> {
  /** The key to set */
  key: K;
  /** The value to cache */
  value: V;
  /** Optional TTL in milliseconds (overrides default) */
  ttl?: number;
}

/**
 * Result of a batch set operation
 * @template K - Key type
 */
export interface BatchSetResult<K> {
  /** Keys that were successfully set */
  success: K[];
  /** Keys that failed to set with error messages */
  failed: Array<{ key: K; error: string }>;
  /** Total number of operations attempted */
  total: number;
}

/**
 * Result of a batch get operation
 * @template K - Key type
 * @template V - Value type
 */
export interface BatchGetResult<K, V> {
  /** Successfully retrieved key-value pairs */
  found: Array<{ key: K; value: V }>;
  /** Keys that were not found or expired */
  notFound: K[];
  /** Total number of keys requested */
  total: number;
}

/**
 * Result of a batch delete operation
 * @template K - Key type
 */
export interface BatchDeleteResult<K> {
  /** Keys that were successfully deleted */
  deleted: K[];
  /** Keys that were not found */
  notFound: K[];
  /** Total number of operations attempted */
  total: number;
}
