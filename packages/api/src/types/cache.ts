/**
 * Request/Response types for the cache API
 */

export interface CacheEntry {
  key: string;
  value: any;
  ttl?: number;
}

export interface CacheSetRequest {
  key: string;
  value: any;
  ttl?: number;
}

export interface CacheUpdateRequest {
  value: any;
  ttl?: number;
}

export interface BatchSetRequest {
  entries: CacheEntry[];
}

export interface BatchGetRequest {
  keys: string[];
}

export interface BatchDeleteRequest {
  keys: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  cache: {
    size: number;
    hitRate: number;
    status: string;
  };
  timestamp: string;
}

export interface BatchOperationResult {
  total: number;
  success: string[];
  failed: Array<{
    key: string;
    error: string;
  }>;
}

export interface CacheKeysResponse {
  keys: string[];
  count: number;
}
