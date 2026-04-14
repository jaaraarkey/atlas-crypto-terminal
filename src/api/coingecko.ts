const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes cache to prevent hitting rate limits

interface CacheEntry {
  data: any;
  timestamp: number;
}

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

export const getTopCoins = async (limit: number = 50) => {
  return await fetchWithCache(`/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`, []);
};

export const getCoinMetrics = async (coinId: string) => {
  return await fetchWithCache(`/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
};
