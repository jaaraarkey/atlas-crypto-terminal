import type { TickerData } from '../context/LivePriceContext';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  ticker?: TickerData;
  symbol: string;
}

export function LiveTickerCard({ ticker, symbol }: Props) {
  if (!ticker) {
    return (
      <div className="glass-panel p-5 rounded-2xl flex items-center justify-center animate-pulse h-[116px]">
        <span className="text-sm text-[var(--text-secondary)] tracking-widest">LOADING {symbol}...</span>
      </div>
    );
  }

  const price = parseFloat(ticker.c);
  const change = parseFloat(ticker.P);
  const isPositive = change >= 0;

  return (
    <Link to={`/trade/${symbol}`} className="glass-panel p-5 rounded-2xl flex flex-col gap-3 hover:border-neon hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
      <div className="flex items-center justify-between">
        <h3 className="font-bold tracking-wider text-[var(--text-secondary)] group-hover:text-white transition-colors">{symbol.replace('USDT', '')}</h3>
        <span className={`flex items-center text-sm font-semibold rounded-full px-2 py-0.5 bg-opacity-20 ${isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
          {isPositive ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>
      <div className="text-2xl font-mono tracking-tight font-bold" style={{ textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>
        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: (price < 1 ? 6 : 2) })}
      </div>
      <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)] flex justify-between">
        <span>Vol 24H</span>
        <span>${(parseFloat(ticker.q) / 1000000).toFixed(1)}M</span>
      </div>
    </Link>
  );
}
