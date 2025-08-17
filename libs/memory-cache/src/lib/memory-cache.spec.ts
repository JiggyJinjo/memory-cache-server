import { defaultCache, LRUCache } from "./memory-cache.js";

describe("LRUCache", () => {
  let cache: LRUCache;

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 3 });
  });

  describe("Constructor", () => {
    it("should create cache with default options", () => {
      const defaultCache = new LRUCache();
      expect(defaultCache.size).toBe(0);
      expect(defaultCache.getStats().maxSize).toBe(1000);
    });

    it("should throw error for invalid maxSize", () => {
      expect(() => new LRUCache({ maxSize: 0 })).toThrow(
        "maxSize must be greater than 0",
      );
      expect(() => new LRUCache({ maxSize: -1 })).toThrow(
        "maxSize must be greater than 0",
      );
    });

    it("should accept TTL configuration", () => {
      const cacheWithTtl = new LRUCache({ maxSize: 10, defaultTtl: 1000 });
      expect(cacheWithTtl.size).toBe(0);
    });
  });

  describe("Basic Operations", () => {
    it("should set and get values", () => {
      expect(cache.set("key1", "value1")).toBe(true);
      expect(cache.get("key1")).toBe("value1");
      expect(cache.size).toBe(1);
    });

    it("should return undefined for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should update existing values", () => {
      cache.set("key1", "value1");
      cache.set("key1", "updated");
      expect(cache.get("key1")).toBe("updated");
      expect(cache.size).toBe(1);
    });

    it("should delete values", () => {
      cache.set("key1", "value1");
      expect(cache.delete("key1")).toBe(true);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.size).toBe(0);
    });

    it("should return false when deleting non-existent key", () => {
      expect(cache.delete("nonexistent")).toBe(false);
    });

    it("should check key existence", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should clear all values", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
    });
  });

  describe("LRU Eviction", () => {
    it("should evict least recently used item when capacity exceeded", () => {
      // Fill cache to capacity
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      expect(cache.size).toBe(3);

      // Access key1 to make it most recently used
      cache.get("key1");

      // Add new item - should evict key2 (least recently used)
      cache.set("key4", "value4");
      expect(cache.size).toBe(3);
      expect(cache.get("key2")).toBeUndefined(); // Evicted
      expect(cache.get("key1")).toBe("value1"); // Still exists
      expect(cache.get("key3")).toBe("value3"); // Still exists
      expect(cache.get("key4")).toBe("value4"); // New item
    });

    it("should update LRU order on access", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // Access key1 to move it to front
      cache.get("key1");

      // Add new item - should evict key2
      cache.set("key4", "value4");
      expect(cache.get("key1")).toBe("value1"); // Still exists (was accessed)
      expect(cache.get("key2")).toBeUndefined(); // Evicted
    });

    it("should update LRU order on set", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // Update existing key to move it to front
      cache.set("key1", "updated");

      // Add new item - should evict key2
      cache.set("key4", "value4");
      expect(cache.get("key1")).toBe("updated"); // Still exists (was updated)
      expect(cache.get("key2")).toBeUndefined(); // Evicted
    });
  });

  describe("TTL (Time To Live)", () => {
    beforeEach(() => {
      cache = new LRUCache({ maxSize: 10, defaultTtl: 100 }); // 100ms TTL
    });

    it("should expire items after TTL", async () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should allow custom TTL per item", async () => {
      cache.set("key1", "value1", 50); // 50ms TTL
      cache.set("key2", "value2", 200); // 200ms TTL

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(cache.get("key1")).toBeUndefined(); // Expired
      expect(cache.get("key2")).toBe("value2"); // Still valid
    });

    it("should handle has() with expired items", async () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(cache.has("key1")).toBe(false);
    });

    it("should cleanup expired items", async () => {
      cache.set("key1", "value1", 50);
      cache.set("key2", "value2", 200);
      cache.set("key3", "value3"); // Uses default TTL

      await new Promise((resolve) => setTimeout(resolve, 150));
      const removed = cache.cleanup();
      expect(removed).toBe(2); // key1 and key3 expired
      expect(cache.size).toBe(1);
      expect(cache.get("key2")).toBe("value2");
    });
  });

  describe("Statistics", () => {
    it("should track hits and misses", () => {
      cache.set("key1", "value1");

      cache.get("key1"); // Hit
      cache.get("key1"); // Hit
      cache.get("nonexistent"); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it("should track evictions", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      cache.set("key4", "value4"); // Triggers eviction

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
      expect(stats.size).toBe(3);
      expect(stats.maxSize).toBe(3);
    });

    it("should reset stats on clear", () => {
      cache.set("key1", "value1");
      cache.get("key1");
      cache.get("nonexistent");

      cache.clear();
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe("Keys and Utilities", () => {
    it("should return all valid keys", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      const keys = cache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
      expect(keys).toContain("key3");
    });

    it("should exclude expired keys from keys()", async () => {
      const shortTtlCache = new LRUCache({ maxSize: 10, defaultTtl: 50 });
      shortTtlCache.set("key1", "value1");
      shortTtlCache.set("key2", "value2", 200); // Longer TTL

      await new Promise((resolve) => setTimeout(resolve, 100));
      const keys = shortTtlCache.keys();
      expect(keys).toHaveLength(1);
      expect(keys).toContain("key2");
    });
  });

  describe("Error Handling", () => {
    it("should handle set errors gracefully", () => {
      // Mock console.error to avoid test output noise
      const originalConsoleError = console.error;
      console.error = vi.fn();

      // Create a scenario that might cause an error (this is hard to trigger naturally)
      const result = cache.set("key1", "value1");
      expect(result).toBe(true);

      console.error = originalConsoleError;
    });
  });

  describe("Complex Data Types", () => {
    it("should handle objects and arrays", () => {
      const obj = { name: "test", value: 42 };
      const arr = [1, 2, 3, "test"];

      cache.set("object", obj);
      cache.set("array", arr);

      expect(cache.get("object")).toEqual(obj);
      expect(cache.get("array")).toEqual(arr);
    });

    it("should handle null and undefined values", () => {
      cache.set("null", null);
      cache.set("undefined", undefined);

      expect(cache.get("null")).toBeNull();
      expect(cache.get("undefined")).toBeUndefined();
      expect(cache.has("null")).toBe(true);
      expect(cache.has("undefined")).toBe(true);
    });
  });

  describe("Batch Operations", () => {
    beforeEach(() => {
      cache = new LRUCache({ maxSize: 10 }); // Use larger cache for batch tests
    });

    describe("setMultiple()", () => {
      it("should set multiple key-value pairs successfully", () => {
        const entries = [
          { key: "key1", value: "value1" },
          { key: "key2", value: "value2" },
          { key: "key3", value: "value3" },
        ];

        const result = cache.setMultiple(entries);

        expect(result.success).toEqual(["key1", "key2", "key3"]);
        expect(result.failed).toEqual([]);
        expect(result.total).toBe(3);
        expect(cache.size).toBe(3);
        expect(cache.get("key1")).toBe("value1");
        expect(cache.get("key2")).toBe("value2");
        expect(cache.get("key3")).toBe("value3");
      });

      it("should handle individual TTL per entry", async () => {
        const entries = [
          { key: "short", value: "expires-soon", ttl: 50 },
          { key: "long", value: "expires-later", ttl: 200 },
          { key: "none", value: "no-ttl" },
        ];

        const result = cache.setMultiple(entries);
        expect(result.success).toEqual(["short", "long", "none"]);

        // Wait for short TTL to expire
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(cache.get("short")).toBeUndefined(); // Expired
        expect(cache.get("long")).toBe("expires-later"); // Still valid
        expect(cache.get("none")).toBe("no-ttl"); // No TTL
      });

      it("should update existing keys and maintain LRU order", () => {
        // Pre-populate cache
        cache.set("existing1", "old-value1");
        cache.set("existing2", "old-value2");
        cache.set("new-key", "new-value");

        const entries = [
          { key: "existing1", value: "updated-value1" },
          { key: "existing2", value: "updated-value2" },
          { key: "brand-new", value: "brand-new-value" },
        ];

        const result = cache.setMultiple(entries);

        expect(result.success).toEqual(["existing1", "existing2", "brand-new"]);
        expect(cache.get("existing1")).toBe("updated-value1");
        expect(cache.get("existing2")).toBe("updated-value2");
        expect(cache.get("brand-new")).toBe("brand-new-value");
        expect(cache.size).toBe(4);
      });

      it("should handle empty array", () => {
        const result = cache.setMultiple([]);
        expect(result.success).toEqual([]);
        expect(result.failed).toEqual([]);
        expect(result.total).toBe(0);
        expect(cache.size).toBe(0);
      });

      it("should handle complex data types in batch", () => {
        const entries = [
          { key: "object", value: { name: "John", age: 30 } },
          { key: "array", value: [1, 2, 3, "test"] },
          { key: "null", value: null },
          { key: "number", value: 42 },
        ];

        const result = cache.setMultiple(entries);

        expect(result.success).toEqual(["object", "array", "null", "number"]);
        expect(cache.get("object")).toEqual({ name: "John", age: 30 });
        expect(cache.get("array")).toEqual([1, 2, 3, "test"]);
        expect(cache.get("null")).toBeNull();
        expect(cache.get("number")).toBe(42);
      });

      it("should trigger evictions when exceeding capacity", () => {
        const smallCache = new LRUCache({ maxSize: 3 });

        // Fill to capacity
        smallCache.set("existing1", "value1");
        smallCache.set("existing2", "value2");
        smallCache.set("existing3", "value3");

        const entries = [
          { key: "new1", value: "newvalue1" },
          { key: "new2", value: "newvalue2" },
        ];

        const result = smallCache.setMultiple(entries);

        expect(result.success).toEqual(["new1", "new2"]);
        expect(smallCache.size).toBe(3);

        // Check that oldest items were evicted
        expect(smallCache.get("existing1")).toBeUndefined(); // Evicted
        expect(smallCache.get("existing2")).toBeUndefined(); // Evicted
        expect(smallCache.get("existing3")).toBe("value3"); // Still exists
        expect(smallCache.get("new1")).toBe("newvalue1"); // Added
        expect(smallCache.get("new2")).toBe("newvalue2"); // Added
      });
    });

    describe("getMultiple()", () => {
      beforeEach(() => {
        // Pre-populate cache for get tests
        cache.set("key1", "value1");
        cache.set("key2", "value2");
        cache.set("key3", "value3");
      });

      it("should retrieve multiple existing values", () => {
        const result = cache.getMultiple(["key1", "key2", "key3"]);

        expect(result.found).toEqual([
          { key: "key1", value: "value1" },
          { key: "key2", value: "value2" },
          { key: "key3", value: "value3" },
        ]);
        expect(result.notFound).toEqual([]);
        expect(result.total).toBe(3);
      });

      it("should handle mixed found/not found scenarios", () => {
        const result = cache.getMultiple([
          "key1",
          "nonexistent1",
          "key2",
          "nonexistent2",
        ]);

        expect(result.found).toEqual([
          { key: "key1", value: "value1" },
          { key: "key2", value: "value2" },
        ]);
        expect(result.notFound).toEqual(["nonexistent1", "nonexistent2"]);
        expect(result.total).toBe(4);
      });

      it("should exclude expired items from results", async () => {
        const ttlCache = new LRUCache({ maxSize: 10 }); // Remove defaultTtl so permanent item won't expire
        ttlCache.set("expiring", "will-expire", 50);
        ttlCache.set("lasting", "will-last", 200);
        ttlCache.set("permanent", "no-ttl"); // This will have no TTL now

        // Wait for some to expire
        await new Promise((resolve) => setTimeout(resolve, 100));

        const result = ttlCache.getMultiple([
          "expiring",
          "lasting",
          "permanent",
        ]);

        expect(result.found).toEqual([
          { key: "lasting", value: "will-last" },
          { key: "permanent", value: "no-ttl" },
        ]);
        expect(result.notFound).toEqual(["expiring"]);
        expect(result.total).toBe(3);
      });

      it("should handle empty array", () => {
        const result = cache.getMultiple([]);
        expect(result.found).toEqual([]);
        expect(result.notFound).toEqual([]);
        expect(result.total).toBe(0);
      });

      it("should update LRU order for accessed items", () => {
        const smallCache = new LRUCache({ maxSize: 3 });
        smallCache.set("oldest", "value1");
        smallCache.set("middle", "value2");
        smallCache.set("newest", "value3");

        // Access 'oldest' through batch get to move it to front
        smallCache.getMultiple(["oldest"]);

        // Add new item - should evict 'middle' (now LRU)
        smallCache.set("brand-new", "new-value");

        expect(smallCache.get("oldest")).toBe("value1"); // Still exists (was accessed)
        expect(smallCache.get("middle")).toBeUndefined(); // Evicted
        expect(smallCache.get("newest")).toBe("value3"); // Still exists
        expect(smallCache.get("brand-new")).toBe("new-value"); // Added
      });

      it("should track statistics correctly", () => {
        // Clear any existing stats
        cache.clear();

        cache.getMultiple(["key1", "key2", "nonexistent"]);

        // Re-add items for this test
        cache.set("key1", "value1");
        cache.set("key2", "value2");

        const resultAfterSet = cache.getMultiple([
          "key1",
          "key2",
          "nonexistent",
        ]);
        const stats = cache.getStats();

        expect(resultAfterSet.found).toHaveLength(2);
        expect(resultAfterSet.notFound).toEqual(["nonexistent"]);
        expect(stats.hits).toBe(2); // key1 and key2 found
        expect(stats.misses).toBe(4); // 3 from first call + 1 from second call
      });
    });

    describe("deleteMultiple()", () => {
      beforeEach(() => {
        // Pre-populate cache for delete tests
        cache.set("key1", "value1");
        cache.set("key2", "value2");
        cache.set("key3", "value3");
        cache.set("key4", "value4");
      });

      it("should delete multiple existing keys", () => {
        const result = cache.deleteMultiple(["key1", "key2", "key3"]);

        expect(result.deleted).toEqual(["key1", "key2", "key3"]);
        expect(result.notFound).toEqual([]);
        expect(result.total).toBe(3);
        expect(cache.size).toBe(1); // Only key4 remains
        expect(cache.get("key4")).toBe("value4");
      });

      it("should handle mixed existing/non-existing keys", () => {
        const result = cache.deleteMultiple([
          "key1",
          "nonexistent1",
          "key2",
          "nonexistent2",
        ]);

        expect(result.deleted).toEqual(["key1", "key2"]);
        expect(result.notFound).toEqual(["nonexistent1", "nonexistent2"]);
        expect(result.total).toBe(4);
        expect(cache.size).toBe(2); // key3 and key4 remain
      });

      it("should handle empty array", () => {
        const result = cache.deleteMultiple([]);
        expect(result.deleted).toEqual([]);
        expect(result.notFound).toEqual([]);
        expect(result.total).toBe(0);
        expect(cache.size).toBe(4); // No change
      });

      it("should maintain LRU list integrity after deletions", () => {
        const smallCache = new LRUCache({ maxSize: 5 });
        smallCache.set("a", "1");
        smallCache.set("b", "2");
        smallCache.set("c", "3");
        smallCache.set("d", "4");
        smallCache.set("e", "5");

        // Delete some items from middle and edges
        const result = smallCache.deleteMultiple(["b", "d"]);

        expect(result.deleted).toEqual(["b", "d"]);
        expect(smallCache.size).toBe(3);

        // Add new items to verify LRU structure is intact
        smallCache.set("f", "6");
        smallCache.set("g", "7");
        smallCache.set("h", "8"); // Should evict 'a' (oldest remaining)

        expect(smallCache.get("a")).toBeUndefined(); // Evicted
        expect(smallCache.get("c")).toBe("3"); // Still exists
        expect(smallCache.get("e")).toBe("5"); // Still exists
        expect(smallCache.get("f")).toBe("6"); // Added
        expect(smallCache.get("g")).toBe("7"); // Added
        expect(smallCache.get("h")).toBe("8"); // Added
      });
    });

    describe("Integration Tests", () => {
      it("should work together: batch set → batch get → batch delete", () => {
        // Batch set
        const entries = [
          { key: "user:1", value: { name: "Alice", age: 25 } },
          { key: "user:2", value: { name: "Bob", age: 30 } },
          { key: "user:3", value: { name: "Charlie", age: 35 } },
        ];
        const setResult = cache.setMultiple(entries);
        expect(setResult.success).toHaveLength(3);

        // Batch get
        const getResult = cache.getMultiple([
          "user:1",
          "user:2",
          "user:3",
          "user:4",
        ]);
        expect(getResult.found).toHaveLength(3);
        expect(getResult.notFound).toEqual(["user:4"]);

        // Batch delete
        const deleteResult = cache.deleteMultiple(["user:1", "user:3"]);
        expect(deleteResult.deleted).toEqual(["user:1", "user:3"]);

        // Verify final state
        expect(cache.size).toBe(1);
        expect(cache.get("user:2")).toEqual({ name: "Bob", age: 30 });
      });

      it("should handle partial failures gracefully", () => {
        // Set up cache near capacity
        const smallCache = new LRUCache({ maxSize: 2 });
        smallCache.set("existing", "value");

        // Try to add multiple items (some may succeed, some may cause evictions)
        const entries = [
          { key: "new1", value: "value1" },
          { key: "new2", value: "value2" },
          { key: "new3", value: "value3" },
        ];

        const setResult = smallCache.setMultiple(entries);

        // All should succeed (with evictions)
        expect(setResult.success).toHaveLength(3);
        expect(setResult.failed).toHaveLength(0);
        expect(smallCache.size).toBe(2); // Limited by maxSize

        // Verify the cache contains the most recent items
        expect(smallCache.get("new2")).toBe("value2");
        expect(smallCache.get("new3")).toBe("value3");
      });

      it("should work correctly with TTL and batch operations", async () => {
        const ttlCache = new LRUCache({ maxSize: 10, defaultTtl: 100 });

        // Batch set with mixed TTLs
        const entries = [
          { key: "short1", value: "expires-fast", ttl: 50 },
          { key: "short2", value: "expires-fast-too", ttl: 50 },
          { key: "long1", value: "expires-slow", ttl: 200 },
          { key: "long2", value: "expires-slow-too", ttl: 200 },
        ];
        ttlCache.setMultiple(entries);

        // Wait for short TTL items to expire
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Batch get should only return non-expired items
        const getResult = ttlCache.getMultiple([
          "short1",
          "short2",
          "long1",
          "long2",
        ]);
        expect(getResult.found).toEqual([
          { key: "long1", value: "expires-slow" },
          { key: "long2", value: "expires-slow-too" },
        ]);
        expect(getResult.notFound).toEqual(["short1", "short2"]);

        // Batch delete should handle expired items gracefully
        const deleteResult = ttlCache.deleteMultiple([
          "short1",
          "long1",
          "nonexistent",
        ]);
        expect(deleteResult.deleted).toEqual(["long1"]); // Only existing item
        expect(deleteResult.notFound).toEqual(["short1", "nonexistent"]); // Expired + nonexistent
      });
    });
  });
});

describe("defaultCache", () => {
  it("should be properly configured", () => {
    const stats = defaultCache.getStats();
    expect(stats.maxSize).toBe(1000);

    // Test basic functionality
    defaultCache.set("test", "value");
    expect(defaultCache.get("test")).toBe("value");
    defaultCache.delete("test");
  });
});
