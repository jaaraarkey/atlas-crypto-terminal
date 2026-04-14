import { useState } from 'react';
import { useLivePrice } from '../context/LivePriceContext';
import { Activity, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const FILTERS = [
  { id: 'rsi_oversold', label: 'RSI Oversold (< 30)', category: 'Momentum', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
  { id: 'rsi_overbought', label: 'RSI Overbought (> 70)', category: 'Momentum', icon: <Activity className="w-4 h-4 text-rose-400" /> },
  { id: 'macd_cross', label: 'MACD Bullish Cross', category: 'Momentum', icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
  { id: 'vol_spike', label: 'Unusual Volume (>200%)', category: 'Volatility', icon: <Zap className="w-4 h-4 text-yellow-400" /> },
  { id: 'sup_res', label: 'Nearing Major Support', category: 'Levels', icon: <AlertTriangle className="w-4 h-4 text-blue-400" /> },
];

export function ScreenerView() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const { tickers } = useLivePrice();
  const [scanning, setScanning] = useState(true);

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  // Mock Screener Logic: Real-time technical oscillators require a web-worker background 
  // stream of K-lines. We simulate the matching logic here based on current price velocity.
  const getResults = () => {
    if (activeFilters.length === 0 || !scanning) return [];
    
    return Object.values(tickers).filter(t => {
      const priceChange = parseFloat(t.P);
      const volume = parseFloat(t.q);
      let matches = false;
      
      if (activeFilters.includes('rsi_oversold') && priceChange < -3) matches = true;
      if (activeFilters.includes('rsi_overbought') && priceChange > 5) matches = true;
      if (activeFilters.includes('vol_spike') && volume > 50000000) matches = true;
      if (activeFilters.includes('macd_cross') && priceChange > 1 && priceChange < 3) matches = true;
      if (activeFilters.includes('sup_res') && priceChange > -1 && priceChange < 1) matches = true;
      
      return matches;
    }).slice(0, 8); // Display top 8 real-time matches
  };

  const results = getResults();

  return (
    <div className="px-6 py-8 h-full flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Advanced Screener</h1>
        <p className="text-[var(--text-secondary)] mt-2">Continuously scanning the highly liquid Binance market against key technical indicators.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl h-fit">
          <div className="flex items-center justify-between mb-6 border-b border-[var(--border-glass)] pb-4">
            <h3 className="font-bold text-sm tracking-widest uppercase">Conditions</h3>
            <button 
              onClick={() => setScanning(!scanning)}
              className={`p-1.5 rounded-full transition-colors ${scanning ? 'bg-emerald-400/20 text-emerald-400 animate-pulse' : 'bg-rose-400/20 text-rose-400'}`}
              title={scanning ? "Pause Scanning" : "Resume Scanning"}
            >
              <Activity className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex flex-col gap-4">
            {FILTERS.map(f => (
              <label key={f.id} className="flex items-center gap-3 cursor-pointer group select-none" onClick={(e) => { e.preventDefault(); toggleFilter(f.id); }}>
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${activeFilters.includes(f.id) ? 'bg-[var(--color-teal-neon)] border-[var(--color-teal-neon)]' : 'border-[var(--text-secondary)] group-hover:border-[var(--color-teal-neon)]'}`}>
                  {activeFilters.includes(f.id) && <div className="w-2.5 h-2.5 bg-black rounded-[2px]" />}
                </div>
                <span className={`flex items-center gap-2 text-sm transition-colors ${activeFilters.includes(f.id) ? 'text-white font-bold' : 'text-[var(--text-primary)] group-hover:text-white'}`}>
                  {f.icon} {f.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl min-h-[500px] flex flex-col">
          <h3 className="font-bold text-sm tracking-widest uppercase text-[var(--text-secondary)] mb-6">Live Match Results</h3>
          
          {activeFilters.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-[var(--text-secondary)] pb-20">
              <Zap className="w-16 h-16 mb-4 opacity-20" />
              <p>Tick the filter boxes to begin background scanning</p>
            </div>
          ) : !scanning ? (
             <div className="flex flex-col items-center justify-center flex-1 text-[var(--text-secondary)] pb-20">
              <Activity className="w-16 h-16 mb-4 opacity-20" />
              <p>Scanner paused.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-[var(--text-secondary)] pb-20">
              <Activity className="w-16 h-16 mb-4 opacity-50 animate-bounce text-emerald-400" />
              <p>Scanning markets... No assets currently match the strict criteria.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((r, i) => (
                <div key={r.s} className="flex items-center justify-between p-4 bg-[var(--border-glass)]/20 hover:bg-[var(--border-glass)] border border-transparent hover:border-neon rounded-xl transition-all duration-300 group" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex items-center gap-6">
                    <span className="font-bold text-xl min-w-[100px] group-hover:text-neon transition-colors">{r.s.replace('USDT', '')}</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 bg-white/5 rounded text-[var(--text-secondary)]">
                      <Zap className="w-3 h-3 text-neon" /> Criteria Met
                    </span>
                  </div>
                  <div className="flex items-center gap-10">
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-xl font-bold">${parseFloat(r.c).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                      <span className={`text-xs font-bold ${parseFloat(r.P) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {parseFloat(r.P) >= 0 ? '+' : ''}{parseFloat(r.P).toFixed(2)}%
                      </span>
                    </div>
                    <Link to={`/trade/${r.s}`} className="px-6 py-2 bg-white/10 border border-[var(--border-glass)] hover:bg-[var(--color-teal-neon)] hover:border-transparent hover:text-black hover:shadow-[0_0_15px_rgba(0,240,255,0.6)] rounded-lg text-sm font-bold tracking-widest transition-all">
                      TRADE
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
