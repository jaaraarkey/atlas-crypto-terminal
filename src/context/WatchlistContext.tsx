/**
 * @file WatchlistContext.tsx
 * @description Global watchlist state management for the ATLAS Crypto Terminal.
 *
 * Maintains an ordered list of Binance trading-pair symbols (e.g. `"BTCUSDT"`)
 * that the user has favourited. The list is persisted to `localStorage` under
 * the key `atlas-watchlist` and is consumed by the dashboard to render
 * `<LiveTickerCard>` widgets for each tracked pair.
 *
 * Default pairs: BTC, ETH, SOL — chosen because they are consistently the most
 * liquid assets on Binance and provide immediate visual data on first load.
 *
 * @example
 *   const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface WatchlistContextType {
  /** Ordered array of Binance pair symbols, e.g. `["BTCUSDT", "ETHUSDT"]`. */
  watchlist: string[];
  /** Append a symbol to the watchlist (no-op if already present). */
  addToWatchlist: (symbol: string) => void;
  /** Remove a symbol from the watchlist. */
  removeFromWatchlist: (symbol: string) => void;
  /** Check if a symbol is currently in the watchlist. */
  isInWatchlist: (symbol: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

/**
 * WatchlistProvider — wraps the application and exposes watchlist CRUD helpers.
 * Persists changes to `localStorage` on every mutation.
 */
export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('atlas-watchlist');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
      }
    }
    return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  });

  useEffect(() => {
    localStorage.setItem('atlas-watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const addToWatchlist = useCallback((symbol: string) => {
    setWatchlist((prev) => {
      if (prev.includes(symbol)) return prev;
      return [...prev, symbol];
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist((prev) => prev.filter((s) => s !== symbol));
  }, []);

  const isInWatchlist = useCallback((symbol: string) => watchlist.includes(symbol), [watchlist]);

  return (
    <WatchlistContext.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
}

/**
 * useWatchlist — convenience hook to consume WatchlistContext.
 * @throws {Error} If called outside of a `<WatchlistProvider>`.
 */
export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
}
