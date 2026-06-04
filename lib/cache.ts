
/**
 * Simple in-memory TTL cache for expensive, rarely-changing data.
 * Eliminates thousands of redundant DB round-trips per minute for
 * platform_settings and system_roles.
 */

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class MemoryCache {
    private store = new Map<string, CacheEntry<any>>();

    get<T>(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.data as T;
    }

    set<T>(key: string, data: T, ttlMs: number): void {
        this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    }

    invalidate(key: string): void {
        this.store.delete(key);
    }

    /** Invalidate all keys matching a prefix (e.g. 'system_roles:' clears all org role caches) */
    invalidatePrefix(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) this.store.delete(key);
        }
    }

    clear(): void {
        this.store.clear();
    }
}

export const cache = new MemoryCache();

// Cache TTLs
export const TTL = {
    PLATFORM_SETTINGS: 30_000,   // 30 seconds — balances freshness with savings
    SYSTEM_ROLES: 5 * 60_000,   // 5 minutes — roles almost never change
    OP_ACCESS: 30_000,           // 30 seconds — actively invalidated on ally membership changes
};
