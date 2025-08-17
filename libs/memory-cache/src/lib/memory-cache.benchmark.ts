/**
 * Memory Cache Benchmarking Suite
 * Tests performance characteristics of the LRU Cache implementation
 *
 * @author Alexandre Ducarne
 */

import { LRUCache } from "./memory-cache.js";

/**
 * Benchmark configuration interface
 */
interface BenchmarkConfig {
  iterations: number;
  cacheSize: number;
  dataSize: string; // 'small' | 'medium' | 'large'
  warmupIterations: number;
}

/**
 * Benchmark results interface
 */
interface BenchmarkResult {
  operation: string;
  operationsPerSecond: number;
  averageTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  memoryUsageMB: number;
  totalIterations: number;
}

/**
 * Memory usage calculation result
 */
interface MemoryAnalysis {
  baseOverheadBytes: number;
  perEntryOverheadBytes: number;
  dataEfficiencyPercent: number;
  totalMemoryMB: number;
  // Enhanced memory breakdown
  actualDataSizeBytes: number;
  cacheInfrastructureOverheadBytes: number;
  overheadPercentage: number;
  estimatedDataSizeBytes: number;
}

/**
 * Comprehensive benchmark suite for LRU Cache
 */
export class CacheBenchmark {
  private readonly configs: Record<string, BenchmarkConfig> = {
    quick: {
      iterations: 100_000,
      cacheSize: 1000,
      dataSize: "small",
      warmupIterations: 10_000,
    },
    standard: {
      iterations: 500_000,
      cacheSize: 5000,
      dataSize: "medium",
      warmupIterations: 50_000,
    },
    intensive: {
      iterations: 1_000_000,
      cacheSize: 10_000,
      dataSize: "large",
      warmupIterations: 100_000,
    },
  };

  /**
   * Runs complete benchmark suite
   * @param configName - Configuration to use ('quick' | 'standard' | 'intensive')
   * @returns Complete benchmark results
   */
  async runBenchmark(
    configName: keyof typeof this.configs = "standard",
  ): Promise<{
    results: BenchmarkResult[];
    memoryAnalysis: MemoryAnalysis;
    summary: string;
  }> {
    const config = this.configs[configName];
    console.log(
      `🚀 Starting ${configName} benchmark with ${config.iterations.toLocaleString()} iterations...`,
    );

    const cache = new LRUCache({
      maxSize: config.cacheSize,
      defaultTtl: 60000, // 1 minute
    });

    // Generate test data
    const testData = this.generateTestData(config);
    console.log(
      `📊 Generated ${testData.length.toLocaleString()} test entries`,
    );

    // Warm up the cache
    await this.warmupCache(cache, testData, config.warmupIterations);
    console.log(
      `🔥 Completed warmup with ${config.warmupIterations.toLocaleString()} operations`,
    );

    const results: BenchmarkResult[] = [];

    // Benchmark cache hits (90% hit rate scenario)
    console.log("🎯 Benchmarking cache hits...");
    results.push(await this.benchmarkCacheHits(cache, testData, config));

    // Benchmark cache misses
    console.log("❌ Benchmarking cache misses...");
    results.push(await this.benchmarkCacheMisses(cache, config));

    // Benchmark set operations
    console.log("📝 Benchmarking set operations...");
    results.push(await this.benchmarkSetOperations(cache, testData, config));

    // Benchmark delete operations
    console.log("🗑️ Benchmarking delete operations...");
    results.push(await this.benchmarkDeleteOperations(cache, testData, config));

    // Benchmark has operations
    console.log("🔍 Benchmarking has operations...");
    results.push(await this.benchmarkHasOperations(cache, testData, config));

    // Benchmark LRU eviction performance
    console.log("♻️ Benchmarking LRU evictions...");
    results.push(await this.benchmarkEvictions(cache, testData, config));

    // Analyze memory usage
    console.log("💾 Analyzing memory usage...");
    const memoryAnalysis = this.analyzeMemoryUsage(cache, testData);

    const summary = this.generateSummary(results, memoryAnalysis, config);

    console.log("✅ Benchmark completed!");
    return { results, memoryAnalysis, summary };
  }

  /**
   * Generates test data of varying sizes
   */
  private generateTestData(
    config: BenchmarkConfig,
  ): Array<{ key: string; value: any }> {
    const data: Array<{ key: string; value: any }> = [];

    for (let i = 0; i < config.cacheSize * 2; i++) {
      const key = `test-key-${i}`;
      let value: any;

      switch (config.dataSize) {
        case "small":
          value = { id: i, active: true };
          break;
        case "medium":
          value = {
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            metadata: { created: Date.now(), tags: ["test", "benchmark"] },
          };
          break;
        case "large":
          value = {
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            profile: {
              bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".repeat(
                10,
              ),
              preferences: { theme: "dark", notifications: true },
              history: Array.from({ length: 50 }, (_, j) => ({
                action: `action-${j}`,
                timestamp: Date.now() - j * 1000,
              })),
            },
            metadata: {
              created: Date.now(),
              updated: Date.now(),
              tags: Array.from({ length: 20 }, (_, j) => `tag-${j}`),
              flags: { premium: i % 10 === 0, verified: i % 5 === 0 },
            },
          };
          break;
      }

      data.push({ key, value });
    }

    return data;
  }

  /**
   * Warms up the cache with initial data
   */
  private async warmupCache(
    cache: LRUCache,
    testData: Array<{ key: string; value: any }>,
    iterations: number,
  ): Promise<void> {
    // Fill cache to capacity
    for (let i = 0; i < Math.min(cache["maxSize"], testData.length); i++) {
      const item = testData[i];
      cache.set(item.key, item.value);
    }

    // Perform warmup operations
    for (let i = 0; i < iterations; i++) {
      const item = testData[i % testData.length];
      cache.get(item.key);
    }
  }

  /**
   * Benchmarks cache hit performance
   */
  private async benchmarkCacheHits(
    cache: LRUCache,
    testData: Array<{ key: string; value: any }>,
    config: BenchmarkConfig,
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Use testData keys that are guaranteed to be in the cache from warmup
    // Filter to only include keys that exist in the cache for accurate hit testing
    const availableKeys = testData
      .slice(0, Math.min(cache["maxSize"], testData.length))
      .map((item) => item.key)
      .filter((key) => cache.has(key));

    // Force garbage collection if available
    if (global.gc) global.gc();

    const memoryBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < config.iterations; i++) {
      const key = availableKeys[i % availableKeys.length];

      const start = process.hrtime.bigint();
      cache.get(key);
      const end = process.hrtime.bigint();

      times.push(Number(end - start) / 1_000_000); // Convert to milliseconds
    }

    const memoryAfter = process.memoryUsage().heapUsed;

    return this.calculateBenchmarkResult(
      "Cache Hits",
      times,
      config.iterations,
      memoryAfter - memoryBefore,
    );
  }

  /**
   * Benchmarks cache miss performance
   */
  private async benchmarkCacheMisses(
    cache: LRUCache,
    config: BenchmarkConfig,
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    if (global.gc) global.gc();
    const memoryBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < config.iterations; i++) {
      const nonExistentKey = `miss-key-${i}`;

      const start = process.hrtime.bigint();
      cache.get(nonExistentKey);
      const end = process.hrtime.bigint();

      times.push(Number(end - start) / 1_000_000);
    }

    const memoryAfter = process.memoryUsage().heapUsed;

    return this.calculateBenchmarkResult(
      "Cache Misses",
      times,
      config.iterations,
      memoryAfter - memoryBefore,
    );
  }

  /**
   * Benchmarks set operation performance
   */
  private async benchmarkSetOperations(
    cache: LRUCache,
    testData: Array<{ key: string; value: any }>,
    config: BenchmarkConfig,
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    if (global.gc) global.gc();
    const memoryBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < config.iterations; i++) {
      const item = testData[i % testData.length];

      const start = process.hrtime.bigint();
      cache.set(`set-bench-${i}`, item.value);
      const end = process.hrtime.bigint();

      times.push(Number(end - start) / 1_000_000);
    }

    const memoryAfter = process.memoryUsage().heapUsed;

    return this.calculateBenchmarkResult(
      "Set Operations",
      times,
      config.iterations,
      memoryAfter - memoryBefore,
    );
  }

  /**
   * Benchmarks delete operation performance
   */
  private async benchmarkDeleteOperations(
    cache: LRUCache,
    testData: Array<{ key: string; value: any }>,
    config: BenchmarkConfig,
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    const keysToDelete: string[] = [];

    // Prepare keys for deletion by adding them to the actual cache
    for (let i = 0; i < config.iterations; i++) {
      const key = `delete-bench-${i}`;
      const item = testData[i % testData.length];
      cache.set(key, item.value);
      keysToDelete.push(key);
    }

    if (global.gc) global.gc();
    const memoryBefore = process.memoryUsage().heapUsed;

    for (const key of keysToDelete) {
      const start = process.hrtime.bigint();
      cache.delete(key);
      const end = process.hrtime.bigint();

      times.push(Number(end - start) / 1_000_000);
    }

    const memoryAfter = process.memoryUsage().heapUsed;

    return this.calculateBenchmarkResult(
      "Delete Operations",
      times,
      config.iterations,
      memoryAfter - memoryBefore,
    );
  }

  /**
   * Benchmarks has operation performance
   */
  private async benchmarkHasOperations(
    cache: LRUCache,
    testData: Array<{ key: string; value: any }>,
    config: BenchmarkConfig,
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    const cacheKeys = cache.keys();

    if (global.gc) global.gc();
    const memoryBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < config.iterations; i++) {
      const key =
        i % 2 === 0
          ? cacheKeys[i % cacheKeys.length] // Existing key
          : `non-existent-${i}`; // Non-existent key

      const start = process.hrtime.bigint();
      cache.has(key);
      const end = process.hrtime.bigint();

      times.push(Number(end - start) / 1_000_000);
    }

    const memoryAfter = process.memoryUsage().heapUsed;

    return this.calculateBenchmarkResult(
      "Has Operations",
      times,
      config.iterations,
      memoryAfter - memoryBefore,
    );
  }

  /**
   * Benchmarks LRU eviction performance
   * Uses the reference cache and fills it beyond capacity to trigger evictions
   */
  private async benchmarkEvictions(
    cache: LRUCache,
    testData: Array<{ key: string; value: any }>,
    config: BenchmarkConfig,
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Ensure cache is at capacity before starting eviction benchmark
    // Fill any remaining space to guarantee evictions will occur
    const currentSize = cache.keys().length;
    const maxSize = cache["maxSize"];

    // Fill to capacity if not already full
    for (let i = currentSize; i < maxSize; i++) {
      const item = testData[i % testData.length];
      cache.set(`pre-eviction-${i}`, item.value);
    }

    if (global.gc) global.gc();
    const memoryBefore = process.memoryUsage().heapUsed;

    // Now perform operations that will cause evictions
    // Limit iterations to avoid excessive runtime while still measuring eviction performance
    const evictionIterations = Math.min(config.iterations, 50_000);

    for (let i = 0; i < evictionIterations; i++) {
      const item = testData[i % testData.length];

      const start = process.hrtime.bigint();
      // This will cause eviction since cache is at capacity
      cache.set(`eviction-${i}`, item.value);
      const end = process.hrtime.bigint();

      times.push(Number(end - start) / 1_000_000);
    }

    const memoryAfter = process.memoryUsage().heapUsed;

    return this.calculateBenchmarkResult(
      "LRU Evictions",
      times,
      evictionIterations,
      memoryAfter - memoryBefore,
    );
  }

  /**
   * Analyzes memory usage patterns using the provided cache as a reference
   */
  private analyzeMemoryUsage(
    cache: LRUCache,
    testData: Array<{ key: string; value: any }>,
  ): MemoryAnalysis {
    if (global.gc) global.gc();

    // Measure baseline memory with empty cache of same type
    const emptyCache = new LRUCache({ maxSize: cache["maxSize"] });
    const baselineMemory = process.memoryUsage().heapUsed;

    // Use the first item from testData to match the benchmark scenario
    const singleItem = testData[0];
    emptyCache.set(singleItem.key, singleItem.value);
    const singleItemMemory = process.memoryUsage().heapUsed;

    // Calculate per-entry overhead
    const singleEntryOverhead = singleItemMemory - baselineMemory;

    // Measure data size vs overhead
    const estimatedKeySize = this.estimateObjectSize(singleItem.key);
    const estimatedValueSize = this.estimateObjectSize(singleItem.value);
    const totalEstimatedDataSize = estimatedKeySize + estimatedValueSize;
    const cacheInfrastructureOverhead = Math.max(
      0,
      singleEntryOverhead - totalEstimatedDataSize,
    );

    const dataEfficiency =
      totalEstimatedDataSize > 0
        ? (totalEstimatedDataSize / singleEntryOverhead) * 100
        : 0;
    const overheadPercentage =
      totalEstimatedDataSize > 0
        ? (cacheInfrastructureOverhead / totalEstimatedDataSize) * 100
        : 0;

    // Use the actual cache's memory footprint for total memory calculation
    const totalMemoryMB = process.memoryUsage().heapUsed / (1024 * 1024);

    return {
      baseOverheadBytes: Math.max(0, baselineMemory),
      perEntryOverheadBytes: Math.round(singleEntryOverhead),
      dataEfficiencyPercent: Math.round(dataEfficiency * 100) / 100,
      totalMemoryMB: Math.round(totalMemoryMB * 100) / 100,
      actualDataSizeBytes: Math.round(totalEstimatedDataSize),
      cacheInfrastructureOverheadBytes: Math.round(cacheInfrastructureOverhead),
      overheadPercentage: Math.round(overheadPercentage * 100) / 100,
      estimatedDataSizeBytes: Math.round(totalEstimatedDataSize),
    };
  }

  /**
   * Estimates the size of a JavaScript object in bytes
   */
  private estimateObjectSize(obj: any): number {
    const seen = new WeakSet();

    function calculateSize(obj: any): number {
      if (obj === null || typeof obj !== "object") {
        if (typeof obj === "string") return obj.length * 2; // 2 bytes per char in UTF-16
        if (typeof obj === "number") return 8; // 64-bit number
        if (typeof obj === "boolean") return 1;
        return 0;
      }

      if (seen.has(obj)) return 0;
      seen.add(obj);

      let size = 0;

      if (Array.isArray(obj)) {
        size += obj.length * 8; // Array overhead
        for (const item of obj) {
          size += calculateSize(item);
        }
      } else {
        size += Object.keys(obj).length * 24; // Object overhead
        for (const [key, value] of Object.entries(obj)) {
          size += calculateSize(key) + calculateSize(value);
        }
      }

      return size;
    }

    return calculateSize(obj);
  }

  /**
   * Calculates benchmark statistics from timing data
   */
  private calculateBenchmarkResult(
    operation: string,
    times: number[],
    iterations: number,
    memoryDelta: number,
  ): BenchmarkResult {
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;

    // Use iterative approach to avoid stack overflow with large arrays
    let minTime = times[0];
    let maxTime = times[0];

    for (let i = 1; i < times.length; i++) {
      if (times[i] < minTime) minTime = times[i];
      if (times[i] > maxTime) maxTime = times[i];
    }

    const opsPerSecond = 1000 / avgTime; // Convert from ms to ops/sec

    return {
      operation,
      operationsPerSecond: Math.round(opsPerSecond),
      averageTimeMs: Math.round(avgTime * 1000) / 1000, // Round to 3 decimal places
      minTimeMs: Math.round(minTime * 1000) / 1000,
      maxTimeMs: Math.round(maxTime * 1000) / 1000,
      memoryUsageMB: Math.round((memoryDelta / (1024 * 1024)) * 100) / 100,
      totalIterations: iterations,
    };
  }

  /**
   * Generates a comprehensive summary of benchmark results
   */
  private generateSummary(
    results: BenchmarkResult[],
    memoryAnalysis: MemoryAnalysis,
    config: BenchmarkConfig,
  ): string {
    const summary = [
      `📊 MEMORY CACHE BENCHMARK RESULTS (${config.iterations.toLocaleString()} iterations)`,
      `${"=".repeat(70)}`,
      "",
      "🚀 PERFORMANCE METRICS:",
      ...results.map(
        (result) =>
          `  ${result.operation.padEnd(20)} │ ${result.operationsPerSecond.toLocaleString().padStart(10)} ops/sec │ ${result.averageTimeMs.toFixed(3).padStart(8)}ms avg`,
      ),
      "",
      "💾 MEMORY ANALYSIS:",
      `  Base overhead:           ${memoryAnalysis.baseOverheadBytes.toLocaleString()} bytes`,
      `  Per-entry overhead:      ${memoryAnalysis.perEntryOverheadBytes.toLocaleString()} bytes`,
      `  Data efficiency:         ${memoryAnalysis.dataEfficiencyPercent}%`,
      `  Total memory usage:      ${memoryAnalysis.totalMemoryMB} MB`,
      `  Actual data size:       ${memoryAnalysis.actualDataSizeBytes.toLocaleString()} bytes`,
      `  Cache overhead:         ${memoryAnalysis.cacheInfrastructureOverheadBytes.toLocaleString()} bytes`,
      `  Overhead percentage:    ${memoryAnalysis.overheadPercentage}%`,
      `  Estimated data size:    ${memoryAnalysis.estimatedDataSizeBytes.toLocaleString()} bytes`,
      "",
      "🎯 VALIDATION AGAINST DOCUMENTATION:",
      `  Cache hits target:       1M+ ops/sec → ${this.getValidationStatus(results.find((r) => r.operation === "Cache Hits")?.operationsPerSecond || 0, 1_000_000)}`,
      `  Cache misses target:     800K+ ops/sec → ${this.getValidationStatus(results.find((r) => r.operation === "Cache Misses")?.operationsPerSecond || 0, 800_000)}`,
      `  Set operations target:   600K+ ops/sec → ${this.getValidationStatus(results.find((r) => r.operation === "Set Operations")?.operationsPerSecond || 0, 600_000)}`,
      `  Memory efficiency:       85%+ → ${this.getValidationStatus(memoryAnalysis.dataEfficiencyPercent, 85)}`,
      "",
    ];

    return summary.join("\n");
  }

  /**
   * Returns validation status emoji
   */
  private getValidationStatus(actual: number, target: number): string {
    return actual >= target
      ? `✅ ${actual.toLocaleString()}`
      : `❌ ${actual.toLocaleString()} (below target)`;
  }

  /**
   * Displays results in a formatted table
   */
  displayResults(results: BenchmarkResult[], summary: string): void {
    console.log("\n📊 DETAILED BENCHMARK RESULTS:");
    console.log(
      "┌─────────────────────┬─────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐",
    );
    console.log(
      "│ Operation           │ Ops/Second      │ Avg Time (ms)│ Min Time (ms)│ Max Time (ms)│ Memory (MB)  │",
    );
    console.log(
      "├─────────────────────┼─────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤",
    );

    results.forEach((result) => {
      console.log(
        `│ ${result.operation.padEnd(19)} │ ${result.operationsPerSecond.toLocaleString().padStart(15)} │ ${result.averageTimeMs.toFixed(3).padStart(12)} │ ${result.minTimeMs.toFixed(3).padStart(12)} │ ${result.maxTimeMs.toFixed(3).padStart(12)} │ ${result.memoryUsageMB.toFixed(2).padStart(12)} │`,
      );
    });

    console.log(
      "└─────────────────────┴─────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘",
    );
    console.log("\n" + summary);
  }
}

/**
 * Utility function to run a quick benchmark
 */
export async function runQuickBenchmark(): Promise<void> {
  const benchmark = new CacheBenchmark();
  const { results, summary } = await benchmark.runBenchmark("quick");

  benchmark.displayResults(results, summary);
}

/**
 * Utility function to run a comprehensive benchmark
 */
export async function runComprehensiveBenchmark(): Promise<void> {
  const benchmark = new CacheBenchmark();
  const { results, summary } = await benchmark.runBenchmark("intensive");

  benchmark.displayResults(results, summary);
}

/**
 * Utility function to run a standard benchmark
 */
export async function runStandardBenchmark(): Promise<void> {
  const benchmark = new CacheBenchmark();
  const { results, summary } = await benchmark.runBenchmark("standard");

  benchmark.displayResults(results, summary);
}
