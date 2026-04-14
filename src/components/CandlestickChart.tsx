import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import useWebSocketBase from 'react-use-websocket';
const useWebSocket = typeof useWebSocketBase === 'function' ? useWebSocketBase : (useWebSocketBase as any).default;

interface Props {
  symbol: string;
}

const INTERVALS = ['1m', '3m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];

export function CandlestickChart({ symbol }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const [interval, setInterval] = useState('1m');
  const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
  const lastTimeRef = useRef<number>(0);

  const { lastJsonMessage } = useWebSocket(wsUrl, {
    shouldReconnect: () => true,
  });

  // Init Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart: any = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 440,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#34d399',
      downColor: '#fb7185',
      borderVisible: false,
      wickUpColor: '#34d399',
      wickDownColor: '#fb7185',
    });

    candlestickSeriesRef.current = candlestickSeries;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch Historical Data
  useEffect(() => {
    let isMounted = true;

    const fetchHistorical = async () => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=1000`);
        const data = await res.json();
        if (!isMounted) return;

        const formattedData = data.map((d: any[]) => ({
          time: Math.floor(d[0] / 1000) as UTCTimestamp,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));

        if (candlestickSeriesRef.current) {
          candlestickSeriesRef.current.setData(formattedData);
          if (formattedData.length > 0) {
            lastTimeRef.current = formattedData[formattedData.length - 1].time;
          }
        }
      } catch (err) {
        console.warn("REST K-lines fetch failed:", err);
      }
    };

    // Delay slightly to ensure Lightweight Charts is fully mounted
    setTimeout(fetchHistorical, 50);

    return () => { isMounted = false; };
  }, [symbol, interval]);

  // Update Data from WS
  useEffect(() => {
    if (lastJsonMessage && (lastJsonMessage as any).k) {
      const kline = (lastJsonMessage as any).k;
      const t = Math.floor(kline.t / 1000);
      
      // Lightweight charts throws an error if we try to inject an older candle. 
      if (t < lastTimeRef.current) return;
      lastTimeRef.current = t;

      const candle = {
        time: t as UTCTimestamp,
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
      };

      if (candlestickSeriesRef.current) {
        // Wrap in try catch to gracefully handle any deep library physics crashes
        try {
          candlestickSeriesRef.current.update(candle);
        } catch (error) {
          console.warn("Lightweight Charts update rejected:", error);
        }
      }
    }
  }, [lastJsonMessage]);

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">{symbol} Live Chart</h3>
        <div className="flex gap-2">
          {INTERVALS.map(int => (
            <button
              key={int}
              onClick={() => {
                setInterval(int);
                lastTimeRef.current = 0; // Reset time check when changing intervals
                if (candlestickSeriesRef.current) {
                  candlestickSeriesRef.current.setData([]); // Flush chart data
                }
              }}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                interval === int
                  ? 'bg-[var(--color-teal-neon)] text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {int === '1M' ? '1mo' : int}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full relative" />
    </div>
  );
}
