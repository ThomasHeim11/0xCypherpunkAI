import { Service, IAgentRuntime, logger } from '@elizaos/core';

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number;
}

/**
 * 🚀 Ultra-Fast Cache Service
 * Provides in-memory caching for scan results, embeddings, and frequently accessed data
 */
export class CacheService extends Service {
  public static serviceType = 'CACHE';

  // Singleton pattern for shared cache
  private static instance: CacheService | null = null;
  private static isInitialized = false;

  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Cache configuration
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_CACHE_SIZE = 10000; // Maximum items in cache
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // Cleanup every 5 minutes

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  /**
   * Static start method following ElizaOS service pattern
   */
  static async start(runtime: IAgentRuntime): Promise<Service> {
    if (CacheService.instance) {
      return CacheService.instance;
    }
    const service = new CacheService(runtime);
    await service.initialize();
    CacheService.instance = service;
    CacheService.isInitialized = true;
    return service;
  }

  /**
   * Static stop method
   */
  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService<CacheService>(CacheService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  private async initialize(): Promise<void> {
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, this.CLEANUP_INTERVAL);

    if (!CacheService.isInitialized) {
      logger.info('🚀 Cache Service started with ultra-fast in-memory caching');
    }
  }

  async stop(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    logger.info('🚀 Cache Service stopped');
  }

  /**
   * Store data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
      hits: 0,
    };

    // Enforce cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastUsed();
    }

    this.cache.set(key, item);
    logger.debug(`💾 Cached item: ${key} (TTL: ${item.ttl}ms)`);
  }

  /**
   * Retrieve data from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      logger.debug(`🗑️ Expired cache item removed: ${key}`);
      return null;
    }

    // Increment hit counter
    item.hits++;
    logger.debug(`🎯 Cache hit: ${key} (hits: ${item.hits})`);

    return item.data;
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove specific item from cache
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      logger.debug(`🗑️ Manually removed cache item: ${key}`);
    }
    return result;
  }

  /**
   * Clear all cache items
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`🧹 Cache cleared: ${size} items removed`);
  }

  /**
   * Get or set pattern - retrieve from cache or compute and cache
   */
  async getOrSet<T>(key: string, computeFn: () => Promise<T> | T, ttl?: number): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute the value
    const startTime = Date.now();
    const value = await computeFn();
    const duration = Date.now() - startTime;

    // Cache the computed value
    this.set(key, value, ttl);
    logger.debug(`⚡ Computed and cached: ${key} (${duration}ms)`);

    return value;
  }

  /**
   * Cache scan results with specialized key format
   */
  cacheScanResult(scanId: string, result: any, ttl?: number): void {
    this.set(`scan:${scanId}`, result, ttl || 60 * 60 * 1000); // 1 hour default
  }

  /**
   * Get cached scan result
   */
  getScanResult(scanId: string): any | null {
    return this.get(`scan:${scanId}`);
  }

  /**
   * Cache embedding with content hash as key
   */
  cacheEmbedding(contentHash: string, embedding: number[], ttl?: number): void {
    this.set(`embedding:${contentHash}`, embedding, ttl || 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Get cached embedding
   */
  getEmbedding(contentHash: string): number[] | null {
    return this.get(`embedding:${contentHash}`);
  }

  /**
   * Cache agent response
   */
  cacheAgentResponse(promptHash: string, response: string, ttl?: number): void {
    this.set(`agent:${promptHash}`, response, ttl || 15 * 60 * 1000); // 15 minutes
  }

  /**
   * Get cached agent response
   */
  getAgentResponse(promptHash: string): string | null {
    return this.get(`agent:${promptHash}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: string;
  } {
    let totalHits = 0;
    let totalRequests = 0;

    for (const item of this.cache.values()) {
      totalHits += item.hits;
      totalRequests += item.hits + 1; // +1 for the initial set
    }

    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    const memoryUsage = `${Math.round(this.cache.size * 0.001)}KB`; // Rough estimate

    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage,
    };
  }

  /**
   * Remove expired items from cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.debug(`🧹 Cleaned up ${removedCount} expired cache items`);
    }
  }

  /**
   * Evict least recently used items when cache is full
   */
  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastHits = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.hits < leastHits) {
        leastHits = item.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      logger.debug(`🗑️ Evicted least used cache item: ${leastUsedKey} (${leastHits} hits)`);
    }
  }

  /**
   * Create a hash for content to use as cache key
   */
  static createHash(content: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  get capabilityDescription(): string {
    return 'Ultra-fast in-memory caching service for scan results, embeddings, agent responses, and frequently accessed data with automatic cleanup and eviction policies.';
  }
}

export default CacheService;
