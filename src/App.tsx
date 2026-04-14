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

/**
 * HomeDashboard — the landing page.
 *
 * Renders the user's watchlist as a responsive card grid, each card
 * streaming live prices from the global Binance WebSocket. Below the
 * cards sits the `<CoinDashboard>` table powered by CoinGecko REST data.
 *
 * A pulsating green dot in the header indicates the WebSocket connection
 * health (`"Open"` / `"Closed"`).
 */
function HomeDashboard() {
  const { watchlist } = useWatchlist();
  const { tickers, connectionStatus } = useLivePrice();

  return (
    <div className="px-6 py-10 h-full flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Live Watchlist</h2>
          <p className="text-sm text-[var(--text-secondary)] hidden sm:block">Instantaneous streaming from Binance WebSockets</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
             {connectionStatus === 'Open' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-teal-neon)] opacity-75"></span>}
             <span className={`relative inline-flex rounded-full h-3 w-3 ${connectionStatus === 'Open' ? 'bg-[var(--color-teal-neon)]' : 'bg-rose-500'}`}></span>
          </span>
          <span className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]">
            WS: {connectionStatus}
          </span>
        </div>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {watchlist.map(symbol => (
          <LiveTickerCard key={symbol} symbol={symbol} ticker={tickers[symbol]} />
        ))}
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
