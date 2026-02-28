import { createHash } from "node:crypto";

// API Response Cache to prevent duplicate requests and reduce API wastage
interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

class APICache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 60 * 60 * 1000; // 1 hour default TTL

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
    };
    this.cache.set(key, entry);
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; totalEntries: number } {
    this.cleanup(); // Clean before reporting stats
    return {
      size: this.cache.size,
      totalEntries: this.cache.size,
    };
  }
}

// Create a global cache instance
export const apiCache = new APICache();

// Run cleanup every 30 minutes (silent — only log when items were removed)
setInterval(
  () => {
    const before = apiCache.getStats().size;
    apiCache.cleanup();
    const after = apiCache.getStats().size;
    if (before > after) {
      console.log(`Cache cleanup: removed ${before - after} expired entries`);
    }
  },
  30 * 60 * 1000,
);

// Generate cache key for image classification
export function generateImageCacheKey(
  imageBuffer: Buffer,
  type: string,
): string {
  const hash = createHash("md5").update(imageBuffer).digest("hex");
  return `image_classification_${type}_${hash}`;
}

// Generate cache key for chat responses
export function generateChatCacheKey(
  message: string,
  history: string[],
): string {
  const content = message + (history || []).join("");
  const hash = createHash("md5").update(content).digest("hex");
  return `chat_response_${hash}`;
}
