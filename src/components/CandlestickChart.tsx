/**
 * @file CandlestickChart.tsx
 * @description Interactive candlestick chart powered by TradingView's `lightweight-charts` v5.
 *
 * Data pipeline:
 *   1. **Historical backfill** — On mount (and on every interval change), the component
 *      fetches up to 1 000 historical K-lines from the Binance REST API
 *      (`GET /api/v3/klines`) and seeds the chart via `setData()`.
 *   2. **Live streaming** — A dedicated Binance WebSocket (`<symbol>@kline_<interval>`)
 *      pushes real-time candle updates which are applied via `update()`, seamlessly
 *      appending to the historical dataset.
 *
 * Supported intervals (matching exact Binance casing):
 *   `1m`, `3m`, `5m`, `15m`, `1h`, `4h`, `1d`, `1w`, `1M`
 *   Note: `1m` = 1 minute, `1M` = 1 month — casing is critical.
 *
 * Safety measures:
 *   - `lastTimeRef` prevents out-of-order ticks from crashing the chart engine.
 *   - All `update()` calls are wrapped in try/catch for graceful degradation.
 *   - Switching intervals flushes chart data and resets the time guard.
 */

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import useWebSocketBase from 'react-use-websocket';
const useWebSocket = typeof useWebSocketBase === 'function' ? useWebSocketBase : (useWebSocketBase as any).default;

interface Props {
  /** Binance pair symbol, e.g. `"BTCUSDT"`. */
  symbol: string;
}

/**
 * Available K-line intervals — these strings are sent directly to the
 * Binance WebSocket and REST APIs so casing must match exactly.
 */
const INTERVALS = ['1m', '3m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];

export function CandlestickChart({ symbol }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const [interval, setInterval] = useState('1m');
  const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
  /** Tracks the most recent candle timestamp to reject out-of-order ticks. */
  const lastTimeRef = useRef<number>(0);

  const { lastJsonMessage } = useWebSocket(wsUrl, {
    shouldReconnect: () => true,
  });

  // ── Phase 1: Initialise the Lightweight Charts instance ──────────────
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

    // lightweight-charts v5 uses `addSeries(SeriesType, options)` instead of
    // the deprecated `addCandlestickSeries(options)` from v4.
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

  // ── Phase 2: Fetch historical K-lines from Binance REST API ──────────
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

    // Delay slightly to ensure the chart DOM element is fully mounted
    setTimeout(fetchHistorical, 50);

    return () => { isMounted = false; };
  }, [symbol, interval]);

  // ── Phase 3: Apply live WebSocket candle ticks ───────────────────────
  useEffect(() => {
    if (lastJsonMessage && (lastJsonMessage as any).k) {
      const kline = (lastJsonMessage as any).k;
      const t = Math.floor(kline.t / 1000);
      
      // Reject out-of-order ticks — lightweight-charts requires strictly
      // ascending timestamps, otherwise it throws a fatal error.
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
                lastTimeRef.current = 0; // Reset time guard for new interval
                if (candlestickSeriesRef.current) {
                  candlestickSeriesRef.current.setData([]); // Flush stale data
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
