/**
 * @file App.tsx
 * @description Root application component — defines routing and page layout.
 *
 * Route map:
 *   `/`               → HomeDashboard (watchlist cards + CoinGecko rankings table)
 *   `/trade/:symbol`  → SymbolDetails  (candlestick chart + orderbook)
 *   `/screener`       → ScreenerView   (condition-based market scanner)
 *
 * Layout structure:
 *   - A subtle ambient glow orb is positioned behind the content for depth.
 *   - `<GlassNavbar>` sticks to the top of the viewport.
 *   - `<main>` is capped at `max-w-screen-2xl` and centers content.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GlassNavbar } from './components/GlassNavbar';
import { useWatchlist } from './context/WatchlistContext';
import { useLivePrice } from './context/LivePriceContext';
import { LiveTickerCard } from './components/LiveTickerCard';
import { CoinDashboard } from './components/CoinDashboard';
import { SymbolDetails } from './components/SymbolDetails';
import { ScreenerView } from './components/ScreenerView';
import { MarketOverview } from './components/MarketOverview';
import { TopMovers } from './components/TopMovers';

/**
 * HomeDashboard — the landing page.
 *
 * Layout:
 *   1. Market Overview (macro stats banner)
 *   2. Top Movers (gainers / losers / most active)
 *   3. Watchlist cards (user's favourites with live prices)
 *   4. CoinDashboard table (CoinGecko rankings)
 */
function HomeDashboard() {
  const { watchlist } = useWatchlist();
  const { tickers, connectionStatus } = useLivePrice();

  return (
    <div className="px-6 py-8 h-full flex flex-col gap-6">
      {/* Market Intelligence */}
      <MarketOverview />

      {/* Top Movers */}
      <TopMovers />

      {/* Watchlist */}
      <div className="flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Watchlist</h2>
            <p className="text-xs text-[var(--text-secondary)] hidden sm:block mt-1">Your tracked pairs — live from Binance WebSocket</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
               {connectionStatus === 'Open' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-teal-neon)] opacity-75"></span>}
               <span className={`relative inline-flex rounded-full h-3 w-3 ${connectionStatus === 'Open' ? 'bg-[var(--color-teal-neon)]' : 'bg-rose-500'}`}></span>
            </span>
            <span className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]">
              {connectionStatus}
            </span>
          </div>
        </header>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {watchlist.map(symbol => (
            <LiveTickerCard key={symbol} symbol={symbol} ticker={tickers[symbol]} />
          ))}
        </div>
      </div>

      <CoinDashboard />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen relative overflow-x-hidden selection:bg-[var(--color-teal-neon)] selection:text-black">
        {/* Background ambient light effects */}
        <div className="absolute top-0 left-1/4 w-[50vw] h-[50vw] bg-[var(--color-teal-neon)]/5 blur-[150px] rounded-full pointer-events-none -z-10 mix-blend-screen" />
        
        <GlassNavbar />
        
        <main className="max-w-screen-2xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/trade/:symbol" element={<SymbolDetails />} />
            <Route path="/screener" element={<ScreenerView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
