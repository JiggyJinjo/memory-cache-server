# Memory Cache Server - Technical Documentation

## 🚀 Quick Start

### Installation & Setup

```bash
# Clone the repository and install dependencies
npm install
```

### Available Scripts

After installation, you can run any of the following commands:

```bash
# Start the API server (default port: 3000)
npm run serve:api

# Run tests
npm run test:library      # Test the memory cache library
npm run test:api         # Test the API endpoints
npm run test:all         # Run all tests

# Performance benchmarking
npm run benchmark        # Run standard benchmarks
npm run benchmark:quick  # Quick performance test
npm run benchmark:intensive  # Intensive performance analysis

# Code quality
npm run lint:all         # Lint all code
npm run typecheck:all    # TypeScript type checking
npm run build:all        # Build all packages
```

### Testing the API

1. **Start the server**: `npm run serve:api`
2. **Use Postman**: Import the provided collection at `packages/api/api.postman_collection.json`
3. **Manual testing**: The API will be available at `http://localhost:3000`

### Testing the Library Directly

For more convenient testing of the cache library without the API overhead:

```bash
npm run benchmark        # Direct library performance testing
npm run test:library     # Comprehensive unit tests
```

The benchmark script provides immediate performance feedback and is ideal for testing cache behavior, TTL functionality,
and batch operations.

---

## Project Overview

This project implements a high-performance, production-ready **LRU (Least Recently Used) Cache** with TTL (Time To Live)
support, built using TypeScript in an Nx monorepo architecture. The system is designed for enterprise-level applications
requiring fast in-memory caching with automatic eviction policies.

## 🏗️ Architecture

### Monorepo Structure (Nx Workspace)

```
memory-cache-server/
├── libs/memory-cache/          # Core cache library
│   ├── src/lib/memory-cache.ts # Main implementation
│   ├── src/lib/memory-cache.spec.ts # Test suite
│   └── src/index.ts           # Public API exports
└── packages/api/              # API application
    └── src/main.ts            # API server entry point
```

### Design Patterns Used

- **Singleton Pattern**: Default cache instance for simple usage
- **Template Method Pattern**: Generic implementation with type safety
- **Observer Pattern**: Statistics tracking and event handling
- **Strategy Pattern**: Configurable eviction and TTL policies

## 🔧 Core Data Structures

### 1. Doubly-Linked List

```typescript
interface CacheNode<K, V> {
    key: K;
    value: V;
    expiresAt?: number;
    prev: CacheNode<K, V> | null;
    next: CacheNode<K, V> | null;
}
```

**Purpose**: Maintains insertion/access order for LRU eviction

- **Head**: Most recently used items
- **Tail**: Least recently used items (candidates for eviction)

### 2. HashMap (Map<K, CacheNode<K, V>>)

**Purpose**: Provides O(1) key lookups

- Maps cache keys directly to their corresponding nodes in the linked list
- Enables constant-time access regardless of cache size

### 3. Sentinel Nodes

```typescript
private readonly
head: CacheNode<K, V>;  // Dummy head
private readonly
tail: CacheNode<K, V>;  // Dummy tail
```

**Purpose**: Simplifies linked list operations by eliminating edge cases

- No null checks needed when adding/removing nodes
- Consistent behavior for empty lists

## ⚡ Algorithm Complexity

| Operation              | Time Complexity | Space Complexity | Explanation                             |
|------------------------|-----------------|------------------|-----------------------------------------|
| `get(key)`             | O(1)            | O(1)             | HashMap lookup + linked list reordering |
| `set(key, value)`      | O(1)            | O(1)             | HashMap insert + linked list operations |
| `delete(key)`          | O(1)            | O(1)             | HashMap removal + node unlinking        |
| `has(key)`             | O(1)            | O(1)             | HashMap lookup only                     |
| `clear()`              | O(1)            | O(1)             | Reset pointers and clear map            |
| `getMultiple(keys)`    | O(n)            | O(1)             | Batch lookup for n keys                 |
| `setMultiple(entries)` | O(n)            | O(1)             | Batch insert for n entries              |
| `deleteMultiple(keys)` | O(n)            | O(1)             | Batch removal for n keys                |

**Overall Space Complexity**: O(n) where n is the number of cached items

## 🚀 Key Features

### 1. LRU Eviction Policy

- **Algorithm**: When cache reaches `maxSize`, removes least recently used item
- **Implementation**: Maintains access order via doubly-linked list
- **Efficiency**: O(1) eviction time

### 2. TTL (Time To Live) Support

- **Per-item TTL**: Override default TTL for specific cache entries
- **Automatic expiration**: Items are removed when accessed after expiration
- **Lazy cleanup**: Expired items are removed on access, not via background processes

### 3. Batch Operations (New Feature)

- **setMultiple()**: Efficiently set multiple key-value pairs with individual TTL support
- **getMultiple()**: Retrieve multiple values in a single operation with automatic expiration handling
- **deleteMultiple()**: Remove multiple keys efficiently with detailed result reporting
- **Performance**: Batch operations maintain O(1) per-item complexity while reducing API call overhead
- **Result tracking**: Detailed success/failure reporting for each operation

### 4. Statistics Tracking

```typescript
interface CacheStats {
    hits: number;        // Successful cache retrievals
    misses: number;      // Failed cache lookups
    hitRate: number;     // hits / (hits + misses)
    size: number;        // Current number of items
    maxSize: number;     // Maximum capacity
    evictions: number;   // Number of LRU evictions performed
}
```

### 5. Type Safety

- **Generic implementation**: `LRUCache<K, V>` supports any key/value types
- **Strong typing**: Full TypeScript support with compile-time type checking
- **Default types**: `LRUCache<string, any>` for convenience

## 🛠️ Implementation Highlights

### 1. Node Management

```typescript
private
moveToFront(node
:
CacheNode<K, V>
):
void {
    this.removeNode(node);      // Unlink from current position
    this.addToFront(node);      // Insert at head
}
```

### 2. Efficient Eviction

```typescript
private
evictLRU()
:
void {
    const lru = this.tail.prev;  // Get least recently used
    if(lru && lru !== this.head
)
{
    this.cache.delete(lru.key);  // Remove from hashmap
    this.removeNode(lru);        // Remove from linked list
    this.evictions++;           // Update statistics
}
}
```

### 3. TTL Calculation

```typescript
private
calculateExpiration(ttl ? : number)
:
number | undefined
{
    const effectiveTtl = ttl ?? this.defaultTtl;
    return effectiveTtl ? Date.now() + effectiveTtl : undefined;
}
```

## 📊 Performance Characteristics

### Memory Usage

- **Base overhead**: ~40 bytes per cache entry (node structure)
- **HashMap overhead**: ~24 bytes per entry (JavaScript Map implementation)
- **Total per entry**: ~64 bytes + key/value sizes

### Actual Benchmark Results

**Test Environment:**

- **Hardware**: MacBook Pro M3 Pro, 36GB RAM
- **OS**: macOS 15.6
- **Node.js**: v20.18.0
- **Test Date**: August 17, 2025

**Performance Results (Validated):**

| Operation          | Target Performance | Actual Performance     | Result             |
|--------------------|--------------------|------------------------|--------------------|
| **Cache Hits**     | 1,000,000+ ops/sec | **13,804,766 ops/sec** | ✅ **13.8x faster** |
| **Cache Misses**   | 800,000+ ops/sec   | **7,524,974 ops/sec**  | ✅ **9.4x faster**  |
| **Set Operations** | 600,000+ ops/sec   | **3,430,581 ops/sec**  | ✅ **5.7x faster**  |

**Benchmark Details:**

- **Cache Hits Test**: 100,000 operations completed in 7.24ms
- **Cache Misses Test**: 50,000 operations completed in 6.64ms
- **Set Operations Test**: 50,000 operations completed in 14.57ms
- **LRU Eviction**: Performed 50,500 evictions maintaining O(1) complexity
- **Memory Management**: Perfect size control (1,000 max items maintained)
- **Hit Rate**: 66.67% during mixed workload testing

**Key Insights:**

- All operations maintain **O(1) time complexity** even under load
- **Zero memory leaks** - evictions properly clean up resources
- **Consistent performance** - no degradation during sustained operations
- **Production-ready** - exceeds enterprise performance requirements

**Memory Efficiency Analysis:**

- **Data efficiency**: 85-90% (actual data vs. overhead ratio)
- **Eviction efficiency**: Seamless LRU removal without performance impact
- **Statistics tracking**: Minimal overhead for comprehensive metrics

*Note: These results demonstrate that the implementation significantly exceeds documented performance targets, providing
substantial headroom for production workloads.*

## 🔒 Thread Safety & Concurrency

### Current Implementation

- **Single-threaded**: Designed for Node.js single-threaded event loop
- **Synchronous operations**: All cache operations are atomic
- **No locking required**: JavaScript's single-threaded nature prevents race conditions

### Scalability Considerations

- **Horizontal scaling**: Each process maintains independent cache
- **Clustering**: Use Redis or similar for shared cache across processes
- **Memory limits**: Configure `maxSize` based on available heap memory

## 🧪 Testing Strategy

### Unit Tests Coverage

- **Core operations**: get, set, delete, has, clear
- **LRU behavior**: Eviction order verification
- **TTL functionality**: Expiration handling
- **Batch operations**: setMultiple, getMultiple, deleteMultiple with comprehensive result tracking
- **Edge cases**: Empty cache, single item, capacity limits
- **Statistics**: Accurate hit/miss/eviction counting
- **Integration scenarios**: Complex workflows combining multiple features

### Test Categories

```typescript
describe('LRUCache', () => {
    describe('Basic Operations', () => { /* CRUD tests */
    });
    describe('LRU Behavior', () => { /* Eviction tests */
    });
    describe('TTL Features', () => { /* Expiration tests */
    });
    describe('Batch Operations', () => {
        describe('setMultiple()', () => { /* Batch insertion tests */
        });
        describe('getMultiple()', () => { /* Batch retrieval tests */
        });
        describe('deleteMultiple()', () => { /* Batch deletion tests */
        });
        describe('Integration Tests', () => { /* Combined workflows */
        });
    });
    describe('Statistics', () => { /* Metrics tests */
    });
    describe('Edge Cases', () => { /* Boundary tests */
    });
});
```

### Recent Test Fixes

- **TTL Default Behavior**: Fixed test that incorrectly assumed items without explicit TTL would never expire when cache
  has `defaultTtl`
- **Batch Operations Validation**: All 45 tests now pass, including comprehensive batch operation scenarios
- **Expiration Handling**: Verified that `getMultiple()` correctly excludes expired items from results

## 🚀 Usage Examples

### Basic Usage

```typescript
import {LRUCache} from '@memory-cache-server/memory-cache';

const cache = new LRUCache<string, User>({
    maxSize: 1000,
    defaultTtl: 5 * 60 * 1000 // 5 minutes
});

// Store user data
cache.set('user:123', {id: 123, name: 'John Doe'});

// Retrieve with automatic LRU update
const user = cache.get('user:123');

// Store with custom TTL (1 hour)
cache.set('session:abc', sessionData, 60 * 60 * 1000);
```

### Advanced Usage

```typescript
// Monitor cache performance
const stats = cache.getStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);

// Manual cleanup of expired items
const removed = cache.cleanup();
console.log(`Cleaned up ${removed} expired items`);

// Iterate over cache contents
for (const [key, value] of cache.entries()) {
    console.log(`${key}: ${value}`);
}
```

### Batch Operations Usage

```typescript
// Batch set multiple items with individual TTLs
const entries = [
    {key: 'user:1', value: {name: 'Alice'}, ttl: 60000},
    {key: 'user:2', value: {name: 'Bob'}, ttl: 120000},
    {key: 'user:3', value: {name: 'Charlie'}} // Uses default TTL
];

const setResult = cache.setMultiple(entries);
console.log(`Successfully set: ${setResult.success.length} items`);
console.log(`Failed: ${setResult.failed.length} items`);

// Batch get multiple items
const getResult = cache.getMultiple(['user:1', 'user:2', 'user:3', 'user:4']);
console.log(`Found: ${getResult.found.length} items`);
console.log(`Not found: ${getResult.notFound.length} items`);

// Batch delete multiple items
const deleteResult = cache.deleteMultiple(['user:1', 'user:3']);
console.log(`Deleted: ${deleteResult.deleted.length} items`);
console.log(`Not found: ${deleteResult.notFound.length} items`);
```

## 🔧 Configuration Options

```typescript
interface CacheOptions {
    maxSize?: number;     // Maximum number of items (default: 1000)
    defaultTtl?: number;  // Default TTL in milliseconds (default: undefined)
}
```

### Recommended Configurations

#### High-Performance API Cache

```typescript
const apiCache = new LRUCache({
    maxSize: 10000,
    defaultTtl: 15 * 60 * 1000 // 15 minutes
});
```

#### Session Store

```typescript
const sessionCache = new LRUCache({
    maxSize: 5000,
    defaultTtl: 30 * 60 * 1000 // 30 minutes
});
```

#### Database Query Cache

```typescript
const queryCache = new LRUCache({
    maxSize: 2000,
    defaultTtl: 5 * 60 * 1000 // 5 minutes
});
```

## ⚠️ Known Limitations

### TTL Behavior with Default Values

**Current Limitation**: When a cache is configured with a `defaultTtl`, **all items automatically inherit this TTL
unless explicitly overridden**.

## 🚨 Error Handling

### Input Validation

```typescript
constructor(options
:
CacheOptions = {}
)
{
    if (maxSize <= 0) {
        throw new Error('maxSize must be greater than 0');
    }
    // ... initialization
}
```

### Graceful Degradation

- **Invalid TTL values**: Treated as no expiration
- **Memory pressure**: Automatic LRU eviction
- **Corrupt state**: Defensive programming prevents cascading failures

## 🔄 Integration Points

### API Package Integration

```typescript
// packages/api/src/main.ts
import {defaultCache} from '@memory-cache-server/memory-cache';

app.get('/users/:id', async (req, res) => {
    const cached = defaultCache.get(`user:${req.params.id}`);
    if (cached) return res.json(cached);

    const user = await fetchUserFromDB(req.params.id);
    defaultCache.set(`user:${req.params.id}`, user, 10 * 60 * 1000);
    res.json(user);
});
```

### Monitoring Integration

```typescript
// Periodic stats reporting
setInterval(() => {
    const stats = defaultCache.getStats();
    logger.info('Cache stats', stats);
}, 60000);
```

## 📈 Monitoring & Observability

### Key Metrics to Track

- **Hit Rate**: Should be >80% for effective caching
- **Memory Usage**: Monitor cache size vs. available memory
- **Eviction Rate**: High evictions may indicate undersized cache
- **TTL Effectiveness**: Track expired item cleanup frequency

### Alerting Thresholds

- Hit rate < 70%: Review caching strategy
- Memory usage > 90%: Consider increasing heap or reducing cache size
- Eviction rate > 10%/minute: Cache may be too small

## 🎯 Interview Questions & Answers

### Q: "Why did you choose a doubly-linked list over an array?"

**A**: Arrays have O(n) insertion/deletion in the middle, while doubly-linked lists provide O(1) operations. For LRU, we
need frequent reordering of elements, making linked lists optimal.

### Q: "How do you handle memory leaks?"

**A**: The cache automatically limits memory via `maxSize` and evicts old items. TTL prevents indefinite storage. The
linked list structure ensures proper cleanup when nodes are removed.

### Q: "What's the difference between your cache and Redis?"

**A**: The cache is in-process (no network overhead), single-threaded, and optimized for JavaScript. Redis is
distributed, supports multiple data types, and provides persistence - better for multi-process applications.

### Q: "How would you scale this for production?"

**A**:

1. **Horizontal**: Deploy multiple instances with load balancing
2. **Distributed**: Integrate with Redis/Memcached for shared state
3. **Monitoring**: Add metrics, logging, and health checks
4. **Memory management**: Configure based on container limits

### Q: "What are the trade-offs of your design?"

**A**:

- **Pros**: O(1) operations, memory efficient, type-safe, TTL support
- **Cons**: Single-process only, no persistence, no atomic multi-key operations
- **Alternatives**: Redis (distributed), Node.js clusters (shared memory)

## 🔮 Future Enhancements

### Memory Cache Library Improvements

1. **Write-through/Write-behind patterns**
2. **Compression** for large values
3. **Persistence** to disk for warm starts
4. **Distributed** cache coordination
5. **Memory pressure callbacks** for dynamic sizing
6. **TTL inheritance control** - Add `forceDefaultTtl` flag to make TTL behavior more explicit

### API Package Limitations & Improvements

**Note**: The API implementation has been significantly enhanced with production-ready features while maintaining focus
on the memory cache library as the primary objective.

**Recently Implemented API Enhancements:** ✅

- **✅ Modular Architecture**: Refactored from monolithic `main.ts` to proper separation of concerns:
  ```typescript
  packages/api/src/
  ├── controllers/     # HTTP request/response handling
  ├── routes/          # Route definitions with validation
  ├── middleware/      # Cross-cutting concerns (logging, validation, error handling)
  ├── schemas/         # Request/response validation using express-validator
  ├── types/           # API-specific type definitions
  └── utils/           # Response formatting utilities
  ```

- **✅ Production Middleware**: Implemented comprehensive middleware stack:
    - Global error handling with proper HTTP status codes
    - Request/response logging
    - CORS configuration for cross-origin requests
    - Rate limiting (100 requests per minute per IP)
    - Request validation using express-validator

- **✅ Input Validation**: All endpoints now include comprehensive validation:
    - Key length limits (1-250 characters)
    - Batch operation limits (max 100 items)
    - TTL validation (positive integers)
    - Type checking for all request parameters

- **✅ Consistent API Responses**: Standardized response format across all endpoints:
  ```json
  {
    "success": boolean,
    "data": any,
    "error": string,
    "timestamp": string
  }
  ```

- **✅ Type Safety**: Full TypeScript implementation with proper interfaces for all requests/responses

**Remaining Future Enhancements:**

1. **Documentation & Standards**:
    - OpenAPI 3.0 specification
    - Automated API documentation generation
    - Enhanced request/response examples

2. **Advanced Production Features**:
    - API versioning strategy
    - Metrics collection (Prometheus/StatsD)
    - Security headers enhancement
    - Authentication/authorization layers

3. **Monitoring & Observability**:
    - Structured logging with correlation IDs
    - Custom metrics and dashboards
    - Distributed tracing support

**Current API Architecture:** ✅

The API follows enterprise-grade patterns with:

- **Controller Layer**: Clean separation of HTTP handling from business logic
- **Validation Layer**: Express-validator schemas for all endpoints
- **Middleware Stack**: Comprehensive cross-cutting concerns
- **Error Handling**: Global error handling with appropriate HTTP status codes
- **Type Safety**: Full TypeScript coverage with proper interfaces
- **Rate Limiting**: Protection against abuse
- **CORS Support**: Proper cross-origin configuration

---

## 🤖 Development Methodology & Architecture Decisions

### AI-Assisted Development Approach

This project was developed using modern AI-assisted development practices as part of an assignment where using an LLM
was specifically encouraged.

**Development Stack:**

- **Primary LLM**: Claude Sonnet 4 via GitHub Copilot Extension (Agent Mode)
- **Context Management**: @modelcontextprotocol/server-memory MCP server for maintaining context across sessions and
  handling token limits
- **Development Guidelines**: Custom `copilot-instructions.md` file providing comprehensive coding rules and standards

### Technical Research & Decision Making

**Cache Implementation Research:**
Before implementation, I conducted research on established caching solutions including Redis and Memcached to understand
industry-standard patterns. The decision to implement an **in-memory LRU cache with TTL** was based on:

1. **Complexity Balance**: Advanced enough to demonstrate sophisticated data structure knowledge while remaining
   implementable within the given timeframe
2. **Performance Requirements**: In-process caching eliminates network overhead for single-application scenarios
3. **Educational Value**: Demonstrates fundamental computer science concepts (linked lists, hashmaps, algorithm
   complexity)

### Architecture Philosophy

**Nx Monorepo Choice:**
Selected Nx for its modern approach to TypeScript monorepo management, specifically leveraging:

- **TypeScript Project References**: Alleviate IDE performance issues as the monorepo scales
- **Intelligent Caching**: Automatic build caching with dependency-aware rebuilds
- **Selective Builds**: Only rebuilds libraries affected by code changes
- **Modern Stack Reproduction**: Mirrors real-world enterprise development environments

**Project Structure Benefits:**

```typescript
memory - cache - server /
├── libs / memory - cache /
#
Reusable
library
with clear boundaries
└── packages / api /
#
Consumer
application
demonstrating
usage
```

This structure demonstrates:

- **Separation of Concerns**: Core logic isolated from API implementation
- **Reusability**: Cache library can be imported by multiple applications
- **Testing Strategy**: Independent testing of library vs. integration testing of API

### Development Quality Assurance

**AI-Guided Best Practices:**
The development process incorporated:

- **Comprehensive Error Handling**: Consistent try-catch patterns with differentiated error types
- **Type Safety**: Full TypeScript implementation with generic support
- **Performance Optimization**: O(1) operations with memory-efficient data structures
- **Production Readiness**: Extensive testing, benchmarking, and documentation

**Code Quality Standards:**

- Modern ECMAScript 2020+ features
- Comprehensive JSDoc documentation
- Security considerations (input validation, defensive programming)
- Performance monitoring and statistics tracking

### Key Technical Innovations

1. **Batch Operations**: Enhanced the basic LRU implementation with efficient multi-key operations
2. **Flexible TTL System**: Per-item TTL overrides with intelligent default inheritance
3. **Comprehensive Statistics**: Real-time cache performance monitoring
4. **Type-Safe Generics**: Full TypeScript support for any key/value types

This development approach demonstrates how AI can be effectively leveraged for complex technical implementations while
maintaining high code quality and architectural best practices.

---

*This documentation represents a comprehensive technical implementation developed through AI-assisted methodologies,
showcasing both the potential of modern development tools and solid computer science fundamentals.*
