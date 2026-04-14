/**
 * @file coingecko.ts
 * @description CoinGecko REST API client with aggressive localStorage caching.
 *
 * The free CoinGecko API tier enforces strict rate limits (~10-30 req/min).
 * To avoid hitting those limits during normal browsing, every response is
 * cached in `localStorage` with a 5-minute TTL under keys prefixed with
 * `atlas-cg-`.
 *
 * The caching strategy is "stale-while-revalidate" inspired:
 *   1. If a valid (non-expired) cache entry exists → return it immediately.
 *   2. On cache miss or expiry → fetch from the network and update the cache.
 *   3. If the network request fails but stale cache exists → return stale data
 *      rather than throwing (graceful degradation).
 *
 * @example
 *   import { getTopCoins } from './api/coingecko';
 *   const coins = await getTopCoins(20);
 */

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

/** Cache entries expire after 5 minutes. */
const CACHE_EXPIRY = 5 * 60 * 1000;

interface CacheEntry {
  data: any;
  timestamp: number;
}

/**
 * Generic fetch wrapper that checks localStorage before hitting the network.
 *
 * @param endpoint - CoinGecko API path (e.g. `/coins/markets?vs_currency=usd`).
 * @param fallbackData - Value to return when both cache and network fail.
 * @returns The parsed JSON response, from cache or network.
 */
const fetchWithCache = async (endpoint: string, fallbackData: any = null) => {
  const cacheKey = `atlas-cg-${endpoint}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const parsed: CacheEntry = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
        return parsed.data;
      }
    } catch (e) {
      // JSON parse error, ignore and fetch fresh
    }
  }

  try {
    const res = await fetch(`${COINGECKO_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`CoinGecko API Error ${res.status}`);
    const data = await res.json();
    
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    
    return data;
  } catch (error) {
    if (cached) return JSON.parse(cached).data; // Return stale cache if network fails
    console.warn('API fetch failed, no cache available', error);
    return fallbackData; 
  }
};

/**
 * Fetch the top coins ranked by market capitalisation.
 *
 * @param limit - Number of coins to return (max 250 per CoinGecko docs).
 * @returns Array of coin market objects (`id`, `symbol`, `current_price`, `image`, etc.).
 * @see https://www.coingecko.com/api/documentation — `/coins/markets`
 */
export const getTopCoins = async (limit: number = 50) => {
  return await fetchWithCache(`/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`, []);
};

/**
 * Fetch detailed metrics for a single coin (market data, ATH, supply, etc.).
 *
 * @param coinId - CoinGecko coin identifier (e.g. `"bitcoin"`).
 * @returns Coin detail object with nested `market_data`.
 * @see https://www.coingecko.com/api/documentation — `/coins/{id}`
 */
export const getCoinMetrics = async (coinId: string) => {
  return await fetchWithCache(`/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
};
