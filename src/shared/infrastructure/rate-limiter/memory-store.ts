interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): { count: number; resetAt: number };
  get(key: string): RateLimitEntry | null;
  cleanup(): void;
}

export function createMemoryStore(): RateLimitStore {
  const store = new Map<string, RateLimitEntry>();

  return {
    increment(key: string, windowMs: number): { count: number; resetAt: number } {
      const now = Date.now();
      const existing = store.get(key);

      if (existing && existing.resetAt > now) {
        existing.count++;
        return { count: existing.count, resetAt: existing.resetAt };
      }

      const entry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      store.set(key, entry);
      return { count: entry.count, resetAt: entry.resetAt };
    },

    get(key: string): RateLimitEntry | null {
      const entry = store.get(key);
      if (!entry) return null;

      if (entry.resetAt <= Date.now()) {
        store.delete(key);
        return null;
      }

      return entry;
    },

    cleanup(): void {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (entry.resetAt <= now) {
          store.delete(key);
        }
      }
    },
  };
}

export const memoryStore = createMemoryStore();

setInterval(() => memoryStore.cleanup(), 60_000);
