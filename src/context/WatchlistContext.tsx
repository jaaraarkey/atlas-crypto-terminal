import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface WatchlistContextType {
  watchlist: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

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

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
}
