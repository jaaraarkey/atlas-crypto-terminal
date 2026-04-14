/**
 * @file ScreenerView.tsx
 * @description Advanced real-time market screener with computed technical indicators.
 *
 * Unlike the previous heuristic-based version, this screener:
 *   - Fetches real 1h K-line data for each liquid USDT pair
 *   - Computes actual RSI-14, MACD (12,26,9), and volume ratios
 *   - Displays real indicator values in a sortable table
 *   - Runs continuous background scan cycles (~60s per full cycle)
 *   - Shows a live progress bar during scanning
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLivePrice } from '../context/LivePriceContext';
import { Activity, Zap, TrendingUp, TrendingDown, ArrowUpDown, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { runScreenerScan, type ScreenerResult } from '../utils/screenerEngine';

type SortKey = 'symbol' | 'price' | 'change24h' | 'rsi' | 'volumeRatio' | 'volume24h';
type SortDir = 'asc' | 'desc';

/** Filter condition definitions. */
const FILTERS = [
  { id: 'rsi_oversold',   label: 'RSI < 30 (Oversold)',     color: 'text-emerald-400' },
  { id: 'rsi_overbought', label: 'RSI > 70 (Overbought)',   color: 'text-rose-400' },
  { id: 'macd_bullish',   label: 'MACD Bullish Cross',      color: 'text-emerald-400' },
  { id: 'macd_bearish',   label: 'MACD Bearish Cross',      color: 'text-rose-400' },
  { id: 'vol_spike',      label: 'Volume > 200% avg',       color: 'text-yellow-400' },
  { id: 'vol_low',        label: 'Volume < 50% avg',        color: 'text-blue-400' },
];

export function ScreenerView() {
  const { tickers } = useLivePrice();
  const [scanning, setScanning] = useState(true);
  const [results, setResults] = useState<Map<string, ScreenerResult>>(new Map());
  const [progress, setProgress] = useState({ scanned: 0, total: 0 });
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('rsi');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const abortRef = useRef<AbortController | null>(null);
  const scanLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store tickers in a ref so the scan loop can read the latest snapshot
  // without being re-triggered every time a new WebSocket frame arrives.
  const tickersRef = useRef(tickers);
  tickersRef.current = tickers;

  // Build the list of liquid USDT pairs from the latest ticker snapshot
  const getLiquidPairs = useCallback(() => {
    const currentTickers = tickersRef.current;
    return Object.values(currentTickers)
      .filter(t => t.s.endsWith('USDT') && parseFloat(t.q) > 500000)
      .sort((a, b) => parseFloat(b.q) - parseFloat(a.q))
      .slice(0, 200)
      .map(t => ({
        symbol: t.s,
        price: parseFloat(t.c),
        change24h: parseFloat(t.P),
        volume24h: parseFloat(t.q),
      }));
  }, []); // No reactive deps — reads from ref

  // Run a single scan cycle
  const runScan = useCallback(async () => {
    const pairs = getLiquidPairs();
    if (pairs.length === 0) return;

    abortRef.current = new AbortController();
    setProgress({ scanned: 0, total: pairs.length });

    const scanResults = await runScreenerScan(
      pairs,
      (scanned, total) => setProgress({ scanned, total }),
      abortRef.current.signal
    );

    if (!abortRef.current.signal.aborted) {
      setResults(scanResults);
      setLastScanTime(new Date());
    }
  }, [getLiquidPairs]);

  // Continuous scan loop — only restarts when scanning is toggled
  useEffect(() => {
    if (!scanning) {
      if (abortRef.current) abortRef.current.abort();
      if (scanLoopRef.current) clearTimeout(scanLoopRef.current);
      return;
    }

    let active = true;
    const loop = async () => {
      if (!active) return;
      await runScan();
      if (active && scanning) {
        scanLoopRef.current = setTimeout(loop, 10000); // Wait 10s between cycles
      }
    };

    // Delay initial scan to let ticker data populate from WebSocket
    const startDelay = setTimeout(loop, 3000);

    return () => {
      active = false;
      clearTimeout(startDelay);
      if (scanLoopRef.current) clearTimeout(scanLoopRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [scanning, runScan]);

  // Toggle filters
  const toggleFilter = (id: string) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  // Handle sorting
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'symbol' ? 'asc' : 'desc'); }
  };

  // Filter and sort results
  const filteredResults = (() => {
    let items = Array.from(results.values());

    // Apply filters (if none active, show all)
    if (activeFilters.length > 0) {
      items = items.filter(r => {
        if (activeFilters.includes('rsi_oversold') && r.rsi !== null && r.rsi < 30) return true;
        if (activeFilters.includes('rsi_overbought') && r.rsi !== null && r.rsi > 70) return true;
        if (activeFilters.includes('macd_bullish') && r.macdSignal === 'bullish') return true;
        if (activeFilters.includes('macd_bearish') && r.macdSignal === 'bearish') return true;
        if (activeFilters.includes('vol_spike') && r.volumeRatio !== null && r.volumeRatio > 200) return true;
        if (activeFilters.includes('vol_low') && r.volumeRatio !== null && r.volumeRatio < 50) return true;
        return false;
      });
    }

    // Sort
    items.sort((a, b) => {
      let valA: number, valB: number;
      switch (sortKey) {
        case 'symbol': return sortDir === 'asc' ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
        case 'price': valA = a.price; valB = b.price; break;
        case 'change24h': valA = a.change24h; valB = b.change24h; break;
        case 'rsi': valA = a.rsi ?? 50; valB = b.rsi ?? 50; break;
        case 'volumeRatio': valA = a.volumeRatio ?? 100; valB = b.volumeRatio ?? 100; break;
        case 'volume24h': valA = a.volume24h; valB = b.volume24h; break;
        default: return 0;
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    return items;
  })();

  const progressPct = progress.total > 0 ? (progress.scanned / progress.total) * 100 : 0;
  const isScanning = scanning && progress.scanned < progress.total;

  // RSI color helper
  const rsiColor = (rsi: number | null) => {
    if (rsi === null) return 'text-[var(--text-secondary)]';
    if (rsi < 30) return 'text-emerald-400';
    if (rsi > 70) return 'text-rose-400';
    return 'text-[var(--text-primary)]';
  };

  // Sort header button
  const SortHeader = ({ label, sortId }: { label: string; sortId: SortKey }) => (
    <button onClick={() => handleSort(sortId)} className="flex items-center gap-1 hover:text-white transition-colors uppercase">
      {label}
      {sortKey === sortId && <ArrowUpDown className="w-3 h-3 text-neon" />}
    </button>
  );

  return (
    <div className="px-6 py-8 h-full flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Screener</h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">
            Computing real RSI-14, MACD, and volume ratios across
            <span className="text-neon font-bold ml-1">{results.size}</span> pairs
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastScanTime && (
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
              Last scan: {lastScanTime.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setScanning(!scanning)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              scanning
                ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                : 'bg-rose-400/15 text-rose-400 border border-rose-400/30'
            }`}
          >
            {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            {scanning ? 'Scanning...' : 'Paused'}
          </button>
        </div>
      </header>

      {/* Progress bar */}
      {isScanning && (
        <div className="w-full">
          <div className="flex justify-between text-[10px] font-mono text-[var(--text-secondary)] mb-1">
            <span>Scanning {progress.scanned}/{progress.total} pairs</span>
            <span>{progressPct.toFixed(0)}%</span>
          </div>
          <div className="w-full h-1 bg-[var(--border-glass)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--color-teal-neon)] rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sidebar - Filters */}
        <div className="lg:col-span-1 glass-panel p-5 rounded-2xl h-fit">
          <h3 className="font-bold text-[10px] tracking-widest uppercase text-[var(--text-secondary)] mb-4">Filter Conditions</h3>
          <div className="flex flex-col gap-3">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={`flex items-center gap-2.5 text-xs text-left px-3 py-2 rounded-lg transition-all ${
                  activeFilters.includes(f.id)
                    ? 'bg-[var(--color-teal-neon)]/10 border border-[var(--color-teal-neon)]/30 text-white font-bold'
                    : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--border-glass)]'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${activeFilters.includes(f.id) ? 'bg-[var(--color-teal-neon)]' : 'bg-[var(--text-secondary)]'}`} />
                {f.label}
              </button>
            ))}
          </div>

          {activeFilters.length > 0 && (
            <button onClick={() => setActiveFilters([])} className="mt-4 text-[10px] text-[var(--text-secondary)] hover:text-white transition-colors uppercase tracking-widest">
              Clear all filters
            </button>
          )}

          <div className="mt-6 pt-4 border-t border-[var(--border-glass)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-2">Stats</div>
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <div>Scanned: <span className="text-white font-bold">{results.size}</span></div>
              <div>Matching: <span className="text-neon font-bold">{filteredResults.length}</span></div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="lg:col-span-4 glass-panel rounded-2xl overflow-hidden">
          {results.size === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-[var(--text-secondary)]">
              <RefreshCw className="w-12 h-12 mb-4 animate-spin opacity-30" />
              <p className="text-sm">Running first scan cycle...</p>
              <p className="text-xs mt-1">Fetching K-lines and computing indicators</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] tracking-widest text-[var(--text-secondary)] border-b border-[var(--border-glass)]">
                    <th className="px-4 py-3 font-bold"><SortHeader label="Symbol" sortId="symbol" /></th>
                    <th className="px-4 py-3 font-bold text-right"><SortHeader label="Price" sortId="price" /></th>
                    <th className="px-4 py-3 font-bold text-right"><SortHeader label="24h%" sortId="change24h" /></th>
                    <th className="px-4 py-3 font-bold text-center"><SortHeader label="RSI-14" sortId="rsi" /></th>
                    <th className="px-4 py-3 font-bold text-center">MACD</th>
                    <th className="px-4 py-3 font-bold text-right"><SortHeader label="Vol Ratio" sortId="volumeRatio" /></th>
                    <th className="px-4 py-3 font-bold text-right"><SortHeader label="Volume" sortId="volume24h" /></th>
                    <th className="px-4 py-3 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map(r => (
                    <tr key={r.symbol} className="border-b border-[var(--border-glass)]/50 hover:bg-[var(--border-glass)] transition-colors group">
                      {/* Symbol */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-sm group-hover:text-neon transition-colors">{r.symbol.replace('USDT', '')}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] ml-1">USDT</span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        ${r.price < 1 ? r.price.toFixed(6) : r.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 24h Change */}
                      <td className={`px-4 py-3 text-right font-mono text-sm font-bold ${r.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {r.change24h >= 0 ? '+' : ''}{r.change24h.toFixed(2)}%
                      </td>

                      {/* RSI */}
                      <td className="px-4 py-3 text-center">
                        {r.rsi !== null ? (
                          <span className={`font-mono text-sm font-bold ${rsiColor(r.rsi)}`}>
                            {r.rsi.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)] text-xs">—</span>
                        )}
                      </td>

                      {/* MACD Signal */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.macdSignal === 'bullish' ? 'bg-emerald-400/15 text-emerald-400' :
                          r.macdSignal === 'bearish' ? 'bg-rose-400/15 text-rose-400' :
                          'bg-white/5 text-[var(--text-secondary)]'
                        }`}>
                          {r.macdSignal === 'bullish' ? <TrendingUp className="w-3 h-3" /> :
                           r.macdSignal === 'bearish' ? <TrendingDown className="w-3 h-3" /> :
                           <Activity className="w-3 h-3" />}
                          {r.macdSignal}
                        </span>
                      </td>

                      {/* Volume Ratio */}
                      <td className="px-4 py-3 text-right">
                        {r.volumeRatio !== null ? (
                          <span className={`font-mono text-sm font-bold ${r.volumeRatio > 200 ? 'text-yellow-400' : r.volumeRatio < 50 ? 'text-blue-400' : 'text-[var(--text-primary)]'}`}>
                            {r.volumeRatio.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)] text-xs">—</span>
                        )}
                      </td>

                      {/* 24h Volume */}
                      <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-secondary)]">
                        ${(r.volume24h / 1e6).toFixed(1)}M
                      </td>

                      {/* Trade Link */}
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/trade/${r.symbol}`}
                          className="px-4 py-1.5 bg-white/5 border border-[var(--border-glass)] hover:bg-[var(--color-teal-neon)] hover:border-transparent hover:text-black hover:shadow-[0_0_12px_rgba(0,240,255,0.5)] rounded-lg text-[10px] font-bold tracking-widest transition-all"
                        >
                          TRADE
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredResults.length === 0 && results.size > 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
                  <Zap className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No assets match the selected filters</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
