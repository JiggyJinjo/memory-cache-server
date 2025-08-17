/**
 * LRU (Least Recently Used) Cache implementation with O(1) operations
 * Supports TTL (Time To Live) and configurable size limits
 *
 * @template K - Key type (must be serializable)
 * @template V - Value type
 * @author Alexandre Ducarne
 */

import type {
  BatchDeleteResult,
  BatchGetResult,
  BatchSetEntry,
  BatchSetResult,
  CacheNode,
  CacheOptions,
  CacheStats
} from "./types.js";
import { DEFAULT_CACHE_OPTIONS, ERROR_MESSAGES } from "./constants.js";

/**
 * Internal cache node implementation for doubly-linked list
 * @template K - Key type
 * @template V - Value type
 */
class CacheNodeImpl<K, V> implements CacheNode<K, V> {
  constructor(
    public key: K,
    public value: V,
    public prev: CacheNodeImpl<K, V> | null = null,
    public next: CacheNodeImpl<K, V> | null = null,
    public expiresAt?: number,
  ) {}
}

/**
 * LRU (Least Recently Used) Cache implementation with O(1) operations
 * Supports TTL (Time To Live) and configurable size limits
 *
 * @template K - Key type (must be serializable)
 * @template V - Value type
 */
export class LRUCache<K = string, V = any> {
  private readonly maxSize: number;
  public readonly defaultTtl?: number;
  private readonly cache = new Map<K, CacheNodeImpl<K, V>>();
  private readonly head: CacheNodeImpl<K, V>;
  private readonly tail: CacheNodeImpl<K, V>;

  // Statistics
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  /**
   * Creates a new LRU Cache instance
   * @param options - Cache configuration options
   * @throws {Error} When maxSize is invalid
   */
  constructor(options: CacheOptions = {}) {
    const { maxSize = DEFAULT_CACHE_OPTIONS.maxSize, defaultTtl } = options;

    if (maxSize <= 0) {
      throw new Error(ERROR_MESSAGES.INVALID_MAX_SIZE);
    }

    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;

    // Create sentinel nodes for head and tail
    this.head = new CacheNodeImpl<K, V>(null as any, null as any);
    this.tail = new CacheNodeImpl<K, V>(null as any, null as any);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Retrieves a value from the cache
   * @param key - The key to retrieve
   * @returns The cached value or undefined if not found/expired
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);

    if (!node) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (node.expiresAt && Date.now() > node.expiresAt) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    // Move to front (most recently used)
    this.moveToFront(node);
    this.hits++;
    return node.value;
  }

  /**
   * Sets a key-value pair in the cache
   * @param key - The key to set
   * @param value - The value to cache
   * @param ttl - Optional TTL in milliseconds (overrides default)
   * @returns True if set successfully
   */
  set(key: K, value: V, ttl?: number): boolean {
    try {
      const existingNode = this.cache.get(key);
      const expiresAt = this.calculateExpiration(ttl);

      if (existingNode) {
        // Update existing node
        existingNode.value = value;
        existingNode.expiresAt = expiresAt;
        this.moveToFront(existingNode);
        return true;
      }

      // Create new node
      const newNode = new CacheNodeImpl(key, value, null, null, expiresAt);

      // Check capacity
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      // Add to cache and move to front
      this.cache.set(key, newNode);
      this.addToFront(newNode);

      return true;
    } catch (error) {
      console.error("Failed to set cache value:", error);
      return false;
    }
  }

  /**
   * Removes a key from the cache
   * @param key - The key to remove
   * @returns True if the key existed and was removed
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    this.cache.delete(key);
    this.removeNode(node);
    return true;
  }

  /**
   * Checks if a key exists in the cache (without updating LRU order)
   * @param key - The key to check
   * @returns True if the key exists and is not expired
   */
  has(key: K): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    // Check if expired
    if (node.expiresAt && Date.now() > node.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clears all items from the cache
   */
  clear(): void {
    this.cache.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Gets all keys currently in the cache
   * @returns Array of all cache keys (excluding expired ones)
   */
  keys(): K[] {
    const keys: K[] = [];
    const now = Date.now();

    for (const [key, node] of this.cache.entries()) {
      if (!node.expiresAt || now <= node.expiresAt) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Gets cache statistics
   * @returns Current cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
      maxSize: this.maxSize,
      evictions: this.evictions,
    };
  }

  /**
   * Gets the current size of the cache
   * @returns Number of items in cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Removes expired entries from the cache
   * @returns Number of expired entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, node] of this.cache.entries()) {
      if (node.expiresAt && now > node.expiresAt) {
        this.delete(key);
        removed++;
      }
    }

    return removed;
  }

  // Batch operations

  /**
   * Sets multiple key-value pairs in the cache efficiently
   * @param entries - Array of entries to set
   * @returns Result object with success/failure details
   */
  setMultiple(entries: BatchSetEntry<K, V>[]): BatchSetResult<K> {
    const result: BatchSetResult<K> = {
      success: [],
      failed: [],
      total: entries.length,
    };

    for (const entry of entries) {
      try {
        const success = this.set(entry.key, entry.value, entry.ttl);
        if (success) {
          result.success.push(entry.key);
        } else {
          result.failed.push({
            key: entry.key,
            error: "Failed to set cache value",
          });
        }
      } catch (error) {
        result.failed.push({
          key: entry.key,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return result;
  }

  /**
   * Retrieves multiple values from the cache efficiently
   * @param keys - Array of keys to retrieve
   * @returns Result object with found/not found details
   */
  getMultiple(keys: K[]): BatchGetResult<K, V> {
    const result: BatchGetResult<K, V> = {
      found: [],
      notFound: [],
      total: keys.length,
    };

    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        result.found.push({ key, value });
      } else {
        result.notFound.push(key);
      }
    }

    return result;
  }

  /**
   * Deletes multiple keys from the cache efficiently
   * @param keys - Array of keys to delete
   * @returns Result object with deleted/not found details
   */
  deleteMultiple(keys: K[]): BatchDeleteResult<K> {
    const result: BatchDeleteResult<K> = {
      deleted: [],
      notFound: [],
      total: keys.length,
    };

    for (const key of keys) {
      const existed = this.delete(key);
      if (existed) {
        result.deleted.push(key);
      } else {
        result.notFound.push(key);
      }
    }

    return result;
  }

  // Private helper methods

  /**
   * Moves a node to the front of the list (most recently used)
   * @param node - The node to move
   */
  private moveToFront(node: CacheNodeImpl<K, V>): void {
    this.removeNode(node);
    this.addToFront(node);
  }

  /**
   * Adds a node to the front of the list
   * @param node - The node to add
   */
  private addToFront(node: CacheNodeImpl<K, V>): void {
    node.prev = this.head;
    node.next = this.head.next;

    if (this.head.next) {
      this.head.next.prev = node;
    }

    this.head.next = node;
  }

  /**
   * Removes a node from the list
   * @param node - The node to remove
   */
  private removeNode(node: CacheNodeImpl<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    }
  }

  /**
   * Evicts the least recently used item
   */
  private evictLRU(): void {
    const lru = this.tail.prev;

    if (lru && lru !== this.head) {
      this.cache.delete(lru.key);
      this.removeNode(lru);
      this.evictions++;
    }
  }

  /**
   * Calculates expiration timestamp
   * @param ttl - TTL in milliseconds
   * @returns Expiration timestamp or undefined
   */
  private calculateExpiration(ttl?: number): number | undefined {
    const effectiveTtl = ttl ?? this.defaultTtl;
    return effectiveTtl ? Date.now() + effectiveTtl : undefined;
  }
}

/**
 * Default cache instance for simple usage
 */
export const defaultCache = new LRUCache<string, any>({
  ...DEFAULT_CACHE_OPTIONS,
  defaultTtl: 5 * 60 * 1000, // 5 minutes default TTL
});
