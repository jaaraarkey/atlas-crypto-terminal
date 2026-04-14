/**
 * @file CandlestickChart.tsx
 * @description Interactive candlestick chart with real technical indicator overlays.
 *
 * Data pipeline:
 *   1. Historical backfill — fetches 1000 K-lines from Binance REST on mount.
 *   2. Indicator computation — runs SMA, EMA, RSI, MACD, Bollinger Bands on close prices.
 *   3. Live streaming — Binance WebSocket pushes real-time candle updates.
 *
 * Indicator overlays (toggleable):
 *   - Volume histogram bars (always on by default)
 *   - MA 20 / MA 50 / MA 200 (moving average lines)
 *   - Bollinger Bands (upper + lower shaded area)
 *   - RSI (separate pane below chart)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import type { UTCTimestamp } from 'lightweight-charts';
import useWebSocketBase from 'react-use-websocket';
import { calculateSMA, calculateRSI, calculateBollingerBands } from '../utils/indicators';
const useWebSocket = typeof useWebSocketBase === 'function' ? useWebSocketBase : (useWebSocketBase as any).default;

interface Props {
  symbol: string;
}

interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const INTERVALS = ['1m', '3m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];

/** Available indicator toggle IDs. */
type IndicatorId = 'vol' | 'ma20' | 'ma50' | 'ma200' | 'bb' | 'rsi';

const INDICATOR_BUTTONS: { id: IndicatorId; label: string; color: string }[] = [
  { id: 'vol',   label: 'Vol',    color: '#64748b' },
  { id: 'ma20',  label: 'MA 20',  color: '#facc15' },
  { id: 'ma50',  label: 'MA 50',  color: '#38bdf8' },
  { id: 'ma200', label: 'MA 200', color: '#a78bfa' },
  { id: 'bb',    label: 'BB',     color: '#f472b6' },
  { id: 'rsi',   label: 'RSI',    color: '#fb923c' },
];

export function CandlestickChart({ symbol }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const rsiChartRef = useRef<any>(null);
  const seriesRefs = useRef<Record<string, any>>({});
  const historicalBars = useRef<OHLCVBar[]>([]);

  const [interval, setInterval] = useState('1h');
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(new Set(['vol', 'ma20']));
  const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
  const lastTimeRef = useRef<number>(0);

  const { lastJsonMessage } = useWebSocket(wsUrl, {
    shouldReconnect: () => true,
  });

  const toggleIndicator = (id: IndicatorId) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Build all indicator series from stored bars ────────────────────
  const applyIndicators = useCallback(() => {
    const bars = historicalBars.current;
    if (bars.length === 0) return;
    const closes = bars.map(b => b.close);
    const times = bars.map(b => b.time);

    // Volume
    if (seriesRefs.current.vol) {
      const volData = bars.map(b => ({
        time: b.time as UTCTimestamp,
        value: b.volume,
        color: b.close >= b.open ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 113, 133, 0.3)',
      }));
      seriesRefs.current.vol.setData(volData);
    }

    // MA 20
    if (seriesRefs.current.ma20) {
      const sma = calculateSMA(closes, 20);
      seriesRefs.current.ma20.setData(sma.map(p => ({ time: times[p.index] as UTCTimestamp, value: p.value })));
    }

    // MA 50
    if (seriesRefs.current.ma50) {
      const sma = calculateSMA(closes, 50);
      seriesRefs.current.ma50.setData(sma.map(p => ({ time: times[p.index] as UTCTimestamp, value: p.value })));
    }

    // MA 200
    if (seriesRefs.current.ma200) {
      const sma = calculateSMA(closes, 200);
      seriesRefs.current.ma200.setData(sma.map(p => ({ time: times[p.index] as UTCTimestamp, value: p.value })));
    }

    // Bollinger Bands
    if (seriesRefs.current.bbUpper && seriesRefs.current.bbLower) {
      const bb = calculateBollingerBands(closes, 20, 2);
      seriesRefs.current.bbUpper.setData(bb.map(p => ({ time: times[p.index] as UTCTimestamp, value: p.upper })));
      seriesRefs.current.bbLower.setData(bb.map(p => ({ time: times[p.index] as UTCTimestamp, value: p.lower })));
    }

    // RSI
    if (seriesRefs.current.rsi) {
      const rsi = calculateRSI(closes, 14);
      seriesRefs.current.rsi.setData(rsi.map(p => ({ time: times[p.index] as UTCTimestamp, value: p.value })));
    }
  }, []);

  // ── Init Charts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
      if (rsiContainerRef.current && rsiChartRef.current) {
        rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
    };

    // ── Main chart ──
    const chart: any = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: { timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#34d399', downColor: '#fb7185', borderVisible: false,
      wickUpColor: '#34d399', wickDownColor: '#fb7185',
    });
    seriesRefs.current.candle = candleSeries;

    // Volume histogram (on price scale right, with low opacity)
    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    seriesRefs.current.vol = volSeries;

    // MA overlay lines
    const ma20 = chart.addSeries(LineSeries, { color: '#facc15', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const ma50 = chart.addSeries(LineSeries, { color: '#38bdf8', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const ma200 = chart.addSeries(LineSeries, { color: '#a78bfa', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    seriesRefs.current.ma20 = ma20;
    seriesRefs.current.ma50 = ma50;
    seriesRefs.current.ma200 = ma200;

    // Bollinger Bands
    const bbUpper = chart.addSeries(LineSeries, { color: 'rgba(244,114,182,0.5)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    const bbLower = chart.addSeries(LineSeries, { color: 'rgba(244,114,182,0.5)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    seriesRefs.current.bbUpper = bbUpper;
    seriesRefs.current.bbLower = bbLower;

    // ── RSI sub-chart ──
    if (rsiContainerRef.current) {
      const rsiChart: any = createChart(rsiContainerRef.current, {
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
        width: rsiContainerRef.current.clientWidth,
        height: 120,
        timeScale: { timeVisible: true, secondsVisible: false },
        rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 } },
      });
      rsiChartRef.current = rsiChart;

      const rsiSeries = rsiChart.addSeries(LineSeries, { color: '#fb923c', lineWidth: 2, priceLineVisible: false, lastValueVisible: true });
      seriesRefs.current.rsi = rsiSeries;
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      if (rsiChartRef.current) rsiChartRef.current.remove();
    };
  }, []);

  // ── Sync visibility when toggles change ────────────────────────────
  useEffect(() => {
    const refs = seriesRefs.current;
    if (refs.vol) refs.vol.applyOptions({ visible: activeIndicators.has('vol') });
    if (refs.ma20) refs.ma20.applyOptions({ visible: activeIndicators.has('ma20') });
    if (refs.ma50) refs.ma50.applyOptions({ visible: activeIndicators.has('ma50') });
    if (refs.ma200) refs.ma200.applyOptions({ visible: activeIndicators.has('ma200') });
    if (refs.bbUpper) refs.bbUpper.applyOptions({ visible: activeIndicators.has('bb') });
    if (refs.bbLower) refs.bbLower.applyOptions({ visible: activeIndicators.has('bb') });
    if (rsiContainerRef.current) {
      rsiContainerRef.current.style.display = activeIndicators.has('rsi') ? 'block' : 'none';
    }
  }, [activeIndicators]);

  // ── Fetch historical K-lines ───────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const fetchHistorical = async () => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=1000`);
        const data = await res.json();
        if (!isMounted || !Array.isArray(data)) return;

        const bars: OHLCVBar[] = data.map((d: any[]) => ({
          time: Math.floor(d[0] / 1000),
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
        }));

        historicalBars.current = bars;

        // Set candlestick data
        if (seriesRefs.current.candle) {
          seriesRefs.current.candle.setData(bars.map(b => ({
            time: b.time as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close,
          })));
        }

        if (bars.length > 0) {
          lastTimeRef.current = bars[bars.length - 1].time;
        }

        // Compute and apply all indicators
        applyIndicators();

        // Sync RSI chart time scale with main chart
        if (chartRef.current && rsiChartRef.current) {
          const mainTimeScale = chartRef.current.timeScale();
          const rsiTimeScale = rsiChartRef.current.timeScale();
          mainTimeScale.subscribeVisibleLogicalRangeChange((range: any) => {
            if (range) rsiTimeScale.setVisibleLogicalRange(range);
          });
        }
      } catch (err) {
        console.warn("REST K-lines fetch failed:", err);
      }
    };

    setTimeout(fetchHistorical, 80);
    return () => { isMounted = false; };
  }, [symbol, interval, applyIndicators]);

  // ── Live WebSocket candle ticks ────────────────────────────────────
  useEffect(() => {
    if (lastJsonMessage && (lastJsonMessage as any).k) {
      const kline = (lastJsonMessage as any).k;
      const t = Math.floor(kline.t / 1000);
      if (t < lastTimeRef.current) return;
      lastTimeRef.current = t;

      const candle = {
        time: t as UTCTimestamp,
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
      };

      if (seriesRefs.current.candle) {
        try { seriesRefs.current.candle.update(candle); } catch (e) { /* swallow */ }
      }

      // Update volume bar for current candle
      if (seriesRefs.current.vol && activeIndicators.has('vol')) {
        try {
          seriesRefs.current.vol.update({
            time: t as UTCTimestamp,
            value: parseFloat(kline.v),
            color: candle.close >= candle.open ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 113, 133, 0.3)',
          });
        } catch (e) { /* swallow */ }
      }
    }
  }, [lastJsonMessage, activeIndicators]);

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3">
      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-bold">{symbol} <span className="text-[var(--text-secondary)] text-sm font-normal">Live Chart</span></h3>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Indicator toggles */}
          <div className="flex gap-1.5">
            {INDICATOR_BUTTONS.map(ind => (
              <button
                key={ind.id}
                onClick={() => toggleIndicator(ind.id)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-all ${
                  activeIndicators.has(ind.id)
                    ? 'border-current opacity-100'
                    : 'border-transparent opacity-40 hover:opacity-70'
                }`}
                style={{ color: ind.color }}
              >
                {ind.label}
              </button>
            ))}
          </div>

          {/* Interval selector */}
          <div className="flex gap-1 border-l border-[var(--border-glass)] pl-3">
            {INTERVALS.map(int => (
              <button
                key={int}
                onClick={() => {
                  setInterval(int);
                  lastTimeRef.current = 0;
                  historicalBars.current = [];
                }}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${
                  interval === int
                    ? 'bg-[var(--color-teal-neon)] text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {int === '1M' ? '1mo' : int}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main candlestick chart */}
      <div ref={chartContainerRef} className="w-full" />

      {/* RSI sub-chart (hidden unless toggled) */}
      <div ref={rsiContainerRef} className="w-full border-t border-[var(--border-glass)] pt-1" style={{ display: activeIndicators.has('rsi') ? 'block' : 'none' }} />
    </div>
  );
}
