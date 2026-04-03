import { useCallback, useMemo, useRef } from 'react';
import { SEARCH_CACHE_MAX_ENTRIES, SEARCH_CACHE_TTL_MS } from '../../utils/constants';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface UseSearchCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
}

export function useSearchCache<T>({
  ttlMs = SEARCH_CACHE_TTL_MS,
  maxEntries = SEARCH_CACHE_MAX_ENTRIES,
}: UseSearchCacheOptions = {}) {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  const sweepExpired = useCallback(() => {
    const now = Date.now();

    for (const [key, entry] of cacheRef.current.entries()) {
      if (entry.expiresAt <= now) {
        cacheRef.current.delete(key);
      }
    }
  }, []);

  const get = useCallback((key: string): T | null => {
    sweepExpired();

    const entry = cacheRef.current.get(key);
    if (!entry) {
      return null;
    }

    // Refresh LRU order on every successful read.
    cacheRef.current.delete(key);
    cacheRef.current.set(key, entry);

    return entry.value;
  }, [sweepExpired]);

  const set = useCallback((key: string, value: T) => {
    sweepExpired();

    if (cacheRef.current.has(key)) {
      cacheRef.current.delete(key);
    }

    cacheRef.current.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    while (cacheRef.current.size > maxEntries) {
      const oldestKey = cacheRef.current.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      cacheRef.current.delete(oldestKey);
    }
  }, [maxEntries, sweepExpired, ttlMs]);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const size = useCallback(() => {
    sweepExpired();
    return cacheRef.current.size;
  }, [sweepExpired]);

  return useMemo(() => ({
    get,
    set,
    clear,
    size,
  }), [clear, get, set, size]);
}
