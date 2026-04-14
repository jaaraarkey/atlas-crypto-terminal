import { useEffect, useState } from 'react';
import { getTopCoins } from '../api/coingecko';
import { useWatchlist } from '../context/WatchlistContext';
import { Star } from 'lucide-react';
import { useLivePrice } from '../context/LivePriceContext';
import { Link } from 'react-router-dom';

export function CoinDashboard() {
  const [coins, setCoins] = useState<any[]>([]);
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { tickers } = useLivePrice();

  useEffect(() => {
    getTopCoins(20).then(data => {
      if (data) setCoins(data);
    });
  }, []);

  return (
    <div className="glass-panel p-6 rounded-2xl mt-4 max-h-[500px] overflow-y-auto custom-scrollbar">
      <h2 className="text-xl font-bold tracking-tight mb-4">Top Liquid Market (CoinGecko REST x Binance WS)</h2>
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-[var(--bg-primary)] z-10">
          <tr className="border-b border-[var(--border-glass)] text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            <th className="pb-3 px-2 font-bold">Rank</th>
            <th className="pb-3 px-2 font-bold">Asset</th>
            <th className="pb-3 px-2 font-bold text-right">Price (Live WS)</th>
            <th className="pb-3 px-2 font-bold text-center">Watchlist</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin, idx) => {
            // Map the CoinGecko symbol to the Binance Pair format
            const binanceSymbol = `${coin.symbol.toUpperCase()}USDT`;
            const isWatched = isInWatchlist(binanceSymbol);
            
            // Override with live Binance data if available
            const livePrice = tickers[binanceSymbol]?.c || coin.current_price;

            return (
              <tr key={coin.id} className="border-b border-[var(--border-glass)] hover:bg-[var(--border-glass)] transition-colors group">
                <td className="py-4 px-2 text-[var(--text-secondary)] font-mono text-sm">{idx + 1}</td>
                <td className="py-4 px-2">
                  <Link to={`/trade/${binanceSymbol}`} className="flex items-center gap-4 hover:bg-[var(--border-glass)] p-1 rounded transition-colors w-fit">
                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full shadow-lg" />
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)] group-hover:text-neon transition-colors">{coin.name}</div>
                      <div className="text-xs font-mono text-[var(--text-secondary)]">{coin.symbol.toUpperCase()}</div>
                    </div>
                  </Link>
                </td>
                <td className="py-4 px-2 text-right font-mono font-bold tracking-tight transition-colors duration-150 group-hover:text-neon">
                  ${parseFloat(livePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </td>
                <td className="py-4 px-2 text-center">
                  <button 
                    onClick={() => isWatched ? removeFromWatchlist(binanceSymbol) : addToWatchlist(binanceSymbol)}
                    className="p-2 hover:scale-110 transition-transform active:scale-95"
                    aria-label="Toggle Watchlist"
                  >
                    <Star className={`w-5 h-5 mx-auto ${isWatched ? 'fill-[var(--color-teal-neon)] text-[var(--color-teal-neon)] drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]' : 'text-[var(--text-secondary)] hover:text-white'}`} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
