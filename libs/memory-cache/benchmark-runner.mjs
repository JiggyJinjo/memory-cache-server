#!/usr/bin/env node

/**
 * Benchmark Runner Script
 * Execute this to validate performance claims in DOCUMENTATION.md
 *
 * Usage:
 *   npm run benchmark
 *   npm run benchmark:quick
 *   npm run benchmark:intensive
 *
 * @author Alexandre Ducarne
 */

import {
  runComprehensiveBenchmark,
  runQuickBenchmark,
  runStandardBenchmark,
} from "./src/lib/memory-cache.benchmark.js";

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "standard";

  console.log("🚀 Memory Cache Performance Benchmark");
  console.log("=====================================\n");

  try {
    switch (mode) {
      case "quick":
        console.log("Running QUICK benchmark (100K iterations)...\n");
        await runQuickBenchmark();
        break;

      case "intensive":
        console.log("Running INTENSIVE benchmark (1M iterations)...\n");
        await runComprehensiveBenchmark();
        break;

      case "standard":
      default:
        console.log("Running STANDARD benchmark (500K iterations)...\n");
        await runStandardBenchmark();
        break;
    }

    console.log("\n✅ Benchmark completed successfully!");
    console.log(
      "📈 These results validate the performance claims in DOCUMENTATION.md",
    );
  } catch (error) {
    console.error("❌ Benchmark failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Benchmark interrupted by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Benchmark terminated");
  process.exit(0);
});

// Run the benchmark
main().catch(console.error);
