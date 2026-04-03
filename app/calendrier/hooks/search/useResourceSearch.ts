import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import rubriqueService from '@/app/service/rubrique.service';
import { Item } from '../../types';
import {
  SEARCH_API_TIMEOUT_MS,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_QUERY_LENGTH,
} from '../../utils/constants';
import { useSearchCache } from '../data/useSearchCache';
import { useDebounce } from '../utils/useDebounce';

interface UseResourceSearchParams {
  query: string;
  types?: string[];
  limit?: number;
  enabled?: boolean;
  minQueryLength?: number;
  debounceMs?: number;
  timeoutMs?: number;
  fallbackItems?: Item[];
  favoriteItems?: Item[];
}

interface LastSearchPayload {
  query: string;
  types: string[];
  limit: number;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeTypes = (types: string[]) => [...types].sort();

const buildCacheKey = (query: string, types: string[], limit: number) => {
  return `${query.toLowerCase()}::${normalizeTypes(types).join(',')}::${limit}`;
};

const getFallbackResults = (source: Item[], query: string): Item[] => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return source.slice(0, SEARCH_DEFAULT_LIMIT);
  }

  return source.filter((item) => {
    for (const value of Object.values(item as unknown as Record<string, unknown>)) {
      if (typeof value === 'string' && value.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
    }
    return false;
  });
};

export function useResourceSearch({
  query,
  types = [],
  limit = SEARCH_DEFAULT_LIMIT,
  enabled = true,
  minQueryLength = SEARCH_MIN_QUERY_LENGTH,
  debounceMs = SEARCH_DEBOUNCE_MS,
  timeoutMs = SEARCH_API_TIMEOUT_MS,
  fallbackItems = [],
}: UseResourceSearchParams) {
  const [results, setResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const lastSearchRef = useRef<LastSearchPayload | null>(null);
  const cache = useSearchCache<Item[]>();

  const debouncedQuery = useDebounce(query, debounceMs);

  const runSearch = useCallback(async (rawQuery: string, forceRefresh: boolean = false) => {
    if (!enabled) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    const normalizedQuery = rawQuery.trim();

    if (normalizedQuery.length < minQueryLength) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    const searchTypes = normalizeTypes(types);
    const key = buildCacheKey(normalizedQuery, searchTypes, limit);

    if (!forceRefresh) {
      const cached = cache.get(key);
      if (cached) {
        setResults(cached);
        setError(null);
        setIsSearching(false);
        return;
      }
    }

    const requestId = ++requestIdRef.current;
    lastSearchRef.current = { query: normalizedQuery, types: searchTypes, limit };

    setIsSearching(true);
    setError(null);

    let attempt = 0;
    let retryDelay = 300;
    let finalResults: Item[] | null = null;

    while (attempt < 3) {
      const response = await rubriqueService.searchRessources(normalizedQuery, searchTypes, limit, timeoutMs);

      
      if (response?.error === 0 && Array.isArray(response.data)) {
        finalResults = response.data as Item[];
        break;
      }

      attempt += 1;
      if (attempt < 3) {
        await wait(retryDelay);
        retryDelay *= 2;
      }
    }

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (finalResults) {
      cache.set(key, finalResults);     
      setResults(finalResults);
      setError(null);
      setIsSearching(false);
      return;
    }

    const fallbackResults = getFallbackResults(fallbackItems, normalizedQuery).slice(0, limit);
    setResults(fallbackResults);
    setError('La recherche distante a échoué. Les résultats locaux sont affichés si disponibles.');
    setIsSearching(false);
  }, [cache, enabled, fallbackItems, limit, minQueryLength, timeoutMs, types]);

  const retrySearch = useCallback(() => {
    const lastSearch = lastSearchRef.current;
    if (!lastSearch) {
      return;
    }

    runSearch(lastSearch.query, true);
  }, [runSearch]);

  useEffect(() => {
    runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  return {
    results,
    isSearching,
    error,
    retrySearch,
    debouncedQuery,
  };
}
