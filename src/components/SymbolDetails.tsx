/**
 * @file SymbolDetails.tsx
 * @description Full-screen trading terminal page for a single asset.
 *
 * Accessed via the route `/trade/:symbol` (e.g. `/trade/BTCUSDT`).
 * Composes the `<CandlestickChart>` and `<OrderbookView>` side by side
 * in a responsive 3:1 grid, with a stats header pulled from the global
 * `LivePriceContext`.
 *
 * Header stats:
 *   - Current price (from live WS ticker).
 *   - 24 h percentage change (coloured green/red).
 *   - 24 h quote volume in USD millions.
 */

import { useParams, Link } from 'react-router-dom';
import { CandlestickChart } from './CandlestickChart';
import { OrderbookView } from './OrderbookView';
import { useLivePrice } from '../context/LivePriceContext';
import { ArrowLeft } from 'lucide-react';

export function SymbolDetails() {
  const { symbol } = useParams();
  const { tickers } = useLivePrice();

  if (!symbol) return null;
  const ticker = tickers[symbol];

  return (
    <div className="px-6 py-6 h-full flex flex-col gap-6 w-full">
      <Link to="/" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header — live stats bar */}
      <header className="flex items-end gap-6 glass-panel p-6 rounded-2xl">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{symbol.replace('USDT', '')} <span className="text-xl text-[var(--text-secondary)]">/ USDT</span></h1>
          <p className="text-sm font-mono text-neon mt-1">Live Trading Terminal</p>
        </div>
        
        {ticker && (
          <div className="flex items-end gap-6 ml-auto">
            <div>
              <div className="text-xs uppercase font-bold text-[var(--text-secondary)] tracking-widest">Price</div>
              <div className="text-2xl font-mono font-bold">${parseFloat(ticker.c).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-[var(--text-secondary)] tracking-widest">24h Change</div>
              <div className={`text-xl font-mono font-bold ${parseFloat(ticker.P) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {parseFloat(ticker.P) >= 0 ? '+' : ''}{parseFloat(ticker.P).toFixed(2)}%
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-xs uppercase font-bold text-[var(--text-secondary)] tracking-widest">24h Volume</div>
              <div className="text-xl font-mono font-bold">${(parseFloat(ticker.q) / 1000000).toFixed(2)}M</div>
            </div>
          </div>
        )}
      </header>

      {/* Terminal Grid — chart (3/4 width) + orderbook (1/4 width) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 w-full">
        <div className="xl:col-span-3 min-h-[500px]">
          <CandlestickChart symbol={symbol} />
        </div>
        
        <div className="xl:col-span-1 h-[500px]">
          <OrderbookView symbol={symbol} />
        </div>
      </div>
    </div>
  );
}
