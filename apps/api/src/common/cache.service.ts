import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

@Injectable()
export class CacheService {
    private cache = new Map<string, CacheEntry<any>>();
    private readonly DEFAULT_TTL = 60000; // 60 seconds

    /**
     * Get a cached value
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.value as T;
    }

    /**
     * Set a cached value with optional TTL (in milliseconds)
     */
    set<T>(key: string, value: T, ttlMs: number = this.DEFAULT_TTL): void {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }

    /**
     * Delete a cached value
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Delete all keys matching a pattern (prefix)
     */
    deleteByPrefix(prefix: string): number {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Clear all cached values
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get or compute: returns cached value or computes it
     */
    async getOrCompute<T>(
        key: string, 
        computeFn: () => Promise<T>, 
        ttlMs: number = this.DEFAULT_TTL
    ): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const value = await computeFn();
        this.set(key, value, ttlMs);
        return value;
    }

    /**
     * Get cache size
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Clean up expired entries
     */
    cleanup(): number {
        const now = Date.now();
        let count = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }
}

// Cache keys constants
export const CACHE_KEYS = {
    DASHBOARD_STATS: 'dashboard:stats',
    USER_STATS: 'users:stats',
    AUDIT_STATS: 'audit:stats',
    CONNECTIONS_COUNT: 'connections:count',
    userDashboard: (userId: string) => `dashboard:user:${userId}`,
};

// TTL constants (in milliseconds)
export const CACHE_TTL = {
    SHORT: 30000,      // 30 seconds
    DEFAULT: 60000,    // 1 minute
    MEDIUM: 300000,    // 5 minutes
    LONG: 600000,      // 10 minutes
};
