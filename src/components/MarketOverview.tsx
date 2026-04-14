/**
 * @file MarketOverview.tsx
 * @description Global crypto market intelligence banner.
 *
 * Displays macro-level stats in a row of glass cards:
 *   - Total Market Cap + 24h % change
 *   - 24h Trading Volume
 *   - BTC Dominance %
 *   - Fear & Greed Index (from alternative.me)
 */

import { useEffect, useState } from 'react';
import { getGlobalData } from '../api/coingecko';
import { TrendingUp, TrendingDown, BarChart3, Bitcoin, Gauge } from 'lucide-react';

interface GlobalData {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  marketCapChange24h: number;
}

interface FearGreed {
  value: number;
  label: string;
}

const FEAR_GREED_COLORS: Record<string, string> = {
  'Extreme Fear': '#ef4444',
  'Fear': '#f97316',
  'Neutral': '#eab308',
  'Greed': '#22c55e',
  'Extreme Greed': '#10b981',
};

export function MarketOverview() {
  const [global, setGlobal] = useState<GlobalData | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);

  useEffect(() => {
    // Fetch CoinGecko global data
    getGlobalData().then(data => {
      if (data?.data) {
        setGlobal({
          totalMarketCap: data.data.total_market_cap?.usd || 0,
          totalVolume: data.data.total_volume?.usd || 0,
          btcDominance: data.data.market_cap_percentage?.btc || 0,
          marketCapChange24h: data.data.market_cap_change_percentage_24h_usd || 0,
        });
      }
    });

    // Fetch Fear & Greed Index
    fetch('https://api.alternative.me/fng/?limit=1')
      .then(r => r.json())
      .then(data => {
        if (data?.data?.[0]) {
          setFearGreed({
            value: parseInt(data.data[0].value),
            label: data.data[0].value_classification,
          });
        }
      })
      .catch(() => {});
  }, []);

  const formatLargeNumber = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    return `$${(n / 1e6).toFixed(0)}M`;
  };

  if (!global) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-panel p-5 rounded-2xl h-24" />
        ))}
      </div>
    );
  }

  const isPositive = global.marketCapChange24h >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Market Cap */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col gap-2 group hover:border-neon transition-all">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]">
          <BarChart3 className="w-3.5 h-3.5" /> Market Cap
        </div>
        <div className="text-xl font-bold font-mono">{formatLargeNumber(global.totalMarketCap)}</div>
        <div className={`text-xs font-bold flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? '+' : ''}{global.marketCapChange24h.toFixed(2)}% (24h)
        </div>
      </div>

      {/* 24h Volume */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col gap-2 group hover:border-neon transition-all">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]">
          <BarChart3 className="w-3.5 h-3.5" /> 24h Volume
        </div>
        <div className="text-xl font-bold font-mono">{formatLargeNumber(global.totalVolume)}</div>
        <div className="text-xs text-[var(--text-secondary)]">Global trading volume</div>
      </div>

      {/* BTC Dominance */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col gap-2 group hover:border-neon transition-all">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]">
          <Bitcoin className="w-3.5 h-3.5" /> BTC Dominance
        </div>
        <div className="text-xl font-bold font-mono">{global.btcDominance.toFixed(1)}%</div>
        <div className="w-full h-1.5 bg-[var(--border-glass)] rounded-full overflow-hidden">
          <div className="h-full bg-[#f7931a] rounded-full transition-all" style={{ width: `${global.btcDominance}%` }} />
        </div>
      </div>

      {/* Fear & Greed */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col gap-2 group hover:border-neon transition-all">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]">
          <Gauge className="w-3.5 h-3.5" /> Fear & Greed
        </div>
        {fearGreed ? (
          <>
            <div className="text-xl font-bold font-mono" style={{ color: FEAR_GREED_COLORS[fearGreed.label] || '#eab308' }}>
              {fearGreed.value}/100
            </div>
            <div className="text-xs font-bold" style={{ color: FEAR_GREED_COLORS[fearGreed.label] || '#eab308' }}>
              {fearGreed.label}
            </div>
          </>
        ) : (
          <div className="text-sm text-[var(--text-secondary)] animate-pulse">Loading...</div>
        )}
      </div>
    </div>
  );
}
