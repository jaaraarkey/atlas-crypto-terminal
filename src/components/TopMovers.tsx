/**
 * @file TopMovers.tsx
 * @description Real-time Top Gainers / Top Losers / Most Active tables.
 *
 * Derives all data from the global LivePriceContext WebSocket ticker stream.
 * Filters to USDT pairs only and sorts by the relevant metric.
 * Updates live as new ticker frames arrive.
 */

import React, { useMemo, useState } from 'react';
import { useLivePrice } from '../context/LivePriceContext';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';

type Tab = 'gainers' | 'losers' | 'active';

export function TopMovers() {
  const { tickers } = useLivePrice();
  const [activeTab, setActiveTab] = useState<Tab>('gainers');

  // Filter to liquid USDT pairs with meaningful volume
  const usdtPairs = useMemo(() => {
    return Object.values(tickers).filter(t => 
      t.s.endsWith('USDT') && parseFloat(t.q) > 500000
    );
  }, [tickers]);

  const sortedData = useMemo(() => {
    const pairs = [...usdtPairs];
    switch (activeTab) {
      case 'gainers':
        return pairs.sort((a, b) => parseFloat(b.P) - parseFloat(a.P)).slice(0, 10);
      case 'losers':
        return pairs.sort((a, b) => parseFloat(a.P) - parseFloat(b.P)).slice(0, 10);
      case 'active':
        return pairs.sort((a, b) => parseFloat(b.q) - parseFloat(a.q)).slice(0, 10);
    }
  }, [usdtPairs, activeTab]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'gainers', label: 'Top Gainers', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'losers', label: 'Top Losers', icon: <TrendingDown className="w-3.5 h-3.5" /> },
    { id: 'active', label: 'Most Active', icon: <Zap className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="glass-panel p-5 rounded-2xl">
      {/* Tab bar */}
      <div className="flex items-center gap-2 mb-5 border-b border-[var(--border-glass)] pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--color-teal-neon)]/10 text-neon border border-[var(--color-teal-neon)]/30'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-mono text-[var(--text-secondary)]">{usdtPairs.length} pairs tracked</span>
      </div>

      {/* Results table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {sortedData.map((t, i) => {
          const change = parseFloat(t.P);
          const isPositive = change >= 0;
          const price = parseFloat(t.c);
          const vol = parseFloat(t.q);

          return (
            <Link
              key={t.s}
              to={`/trade/${t.s}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--border-glass)]/20 hover:bg-[var(--border-glass)] border border-transparent hover:border-neon transition-all group"
            >
              <span className="text-[10px] font-mono text-[var(--text-secondary)] w-4">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm group-hover:text-neon transition-colors truncate">{t.s.replace('USDT', '')}</div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)]">
                  ${price < 1 ? price.toFixed(6) : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{change.toFixed(2)}%
                </div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)]">${(vol / 1e6).toFixed(1)}M</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
