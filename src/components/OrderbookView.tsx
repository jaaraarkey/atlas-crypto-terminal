import { useEffect, useState } from 'react';
import useWebSocketBase from 'react-use-websocket';
const useWebSocket = typeof useWebSocketBase === 'function' ? useWebSocketBase : (useWebSocketBase as any).default;

interface Props {
  symbol: string;
}

interface Order {
  price: string;
  amount: string;
  total: number;
}

export function OrderbookView({ symbol }: Props) {
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);
  const [maxTotal, setMaxTotal] = useState<number>(0);

  const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@100ms`;

  const { lastJsonMessage } = useWebSocket(wsUrl, {
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (lastJsonMessage && (lastJsonMessage as any).bids && (lastJsonMessage as any).asks) {
      const msg = lastJsonMessage as any;
      
      let runningBidTotal = 0;
      const parsedBids = msg.bids.slice(0, 15).map((b: string[]) => {
        runningBidTotal += parseFloat(b[1]);
        return { price: b[0], amount: b[1], total: runningBidTotal };
      });

      let runningAskTotal = 0;
      const parsedAsks = msg.asks.slice(0, 15).map((a: string[]) => {
        runningAskTotal += parseFloat(a[1]);
        return { price: a[0], amount: a[1], total: runningAskTotal };
      });

      setBids(parsedBids);
      setAsks(parsedAsks.reverse()); // Reverse asks so lowest price is at the bottom (closest to spread)

      const highestBidTotal = parsedBids.length > 0 ? parsedBids[parsedBids.length - 1].total : 0;
      const highestAskTotal = parsedAsks.length > 0 ? parsedAsks[0].total : 0; // After reverse, index 0 is highest total
      
      setMaxTotal(Math.max(highestBidTotal, highestAskTotal));
    }
  }, [lastJsonMessage]);

  const renderRow = (order: Order, type: 'bid' | 'ask') => {
    const depthPercentage = maxTotal > 0 ? (order.total / maxTotal) * 100 : 0;
    const isBid = type === 'bid';
    const colorClass = isBid ? 'text-emerald-400' : 'text-rose-400';
    const bgClass = isBid ? 'bg-emerald-400/10' : 'bg-rose-400/10';

    return (
      <div key={order.price} className="relative flex justify-between text-xs py-1 px-2 font-mono group hover:bg-[var(--border-glass)] cursor-crosshair">
        <div 
          className={`absolute top-0 ${isBid ? 'left-0' : 'right-0'} h-full ${bgClass} transition-all duration-300`} 
          style={{ width: `${depthPercentage}%`, zIndex: 0 }} 
        />
        <span className={`z-10 ${colorClass}`}>{parseFloat(order.price).toFixed(2)}</span>
        <span className="z-10 text-[var(--text-secondary)]">{parseFloat(order.amount).toFixed(4)}</span>
        <span className="z-10 text-white min-w-[60px] text-right">{order.total.toFixed(4)}</span>
      </div>
    );
  };

  return (
    <div className="glass-panel p-4 rounded-2xl flex flex-col h-full min-h-[400px]">
      <h3 className="font-bold tracking-widest text-sm mb-4 uppercase text-[var(--text-secondary)]">Orderbook Depth</h3>
      
      <div className="flex justify-between text-[10px] uppercase font-bold text-[var(--text-secondary)] px-2 mb-2">
        <span>Price</span>
        <span>Amount</span>
        <span>Total</span>
      </div>

      <div className="flex flex-col flex-1 gap-1">
        {/* Asks (Sells) */}
        <div className="flex flex-col justify-end min-h-[150px]">
          {asks.map(a => renderRow(a, 'ask'))}
        </div>

        {/* Spread Divider */}
        <div className="flex items-center justify-center py-2 text-[10px] text-[var(--text-secondary)] tracking-widest bg-[var(--border-glass)]/20 my-1 rounded">
          Spread Data
        </div>

        {/* Bids (Buys) */}
        <div className="flex flex-col justify-start min-h-[150px]">
          {bids.map(b => renderRow(b, 'bid'))}
        </div>
      </div>
    </div>
  );
}
