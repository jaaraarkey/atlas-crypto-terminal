/**
 * @file screenerEngine.ts
 * @description Background market scanning engine that computes real technical
 * indicators for all liquid USDT pairs on Binance.
 *
 * Workflow:
 *   1. Receives a list of liquid symbols from the caller.
 *   2. Fetches 50 hourly K-lines per symbol via Binance REST API.
 *   3. Computes RSI-14, MACD (12,26,9), and volume ratio (current vs 20-period avg).
 *   4. Returns a Map of results keyed by symbol.
 *
 * Batching:
 *   - Processes symbols in batches of 10 with 300ms delays between batches
 *     to stay well within Binance's 1200 req/min rate limit.
 *   - Reports progress via a callback so the UI can show a progress bar.
 */

import { calculateRSI, calculateMACD } from './indicators';

/** Computed indicator snapshot for a single symbol. */
export interface ScreenerResult {
  symbol: string;
  price: number;
  change24h: number;
  rsi: number | null;
  macdHistogram: number | null;
  macdSignal: 'bullish' | 'bearish' | 'neutral';
  volumeRatio: number | null;  // current vol / 20-period avg vol
  volume24h: number;
}

/** Progress callback signature. */
export type ProgressCallback = (scanned: number, total: number) => void;

/**
 * Fetch K-lines and compute indicators for a single symbol.
 * Returns null if the fetch fails (graceful degradation).
 */
async function scanSymbol(
  symbol: string,
  price: number,
  change24h: number,
  volume24h: number
): Promise<ScreenerResult | null> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=50`
    );
    if (!res.ok) return null;
    const klines = await res.json();
    if (!Array.isArray(klines) || klines.length < 30) return null;

    const closes = klines.map((k: any[]) => parseFloat(k[4]));
    const volumes = klines.map((k: any[]) => parseFloat(k[5]));

    // RSI-14
    const rsiData = calculateRSI(closes, 14);
    const rsi = rsiData.length > 0 ? rsiData[rsiData.length - 1].value : null;

    // MACD (12, 26, 9)
    const macdData = calculateMACD(closes);
    let macdHistogram: number | null = null;
    let macdSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (macdData.length >= 2) {
      const latest = macdData[macdData.length - 1];
      const prev = macdData[macdData.length - 2];
      macdHistogram = latest.histogram;
      if (latest.histogram > 0 && prev.histogram <= 0) macdSignal = 'bullish';
      else if (latest.histogram < 0 && prev.histogram >= 0) macdSignal = 'bearish';
      else if (latest.histogram > 0) macdSignal = 'bullish';
      else if (latest.histogram < 0) macdSignal = 'bearish';
    }

    // Volume ratio: latest volume / 20-period average volume
    let volumeRatio: number | null = null;
    if (volumes.length >= 21) {
      const recentVols = volumes.slice(-21, -1); // last 20 bars (excluding current)
      const avgVol = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
      const currentVol = volumes[volumes.length - 1];
      volumeRatio = avgVol > 0 ? (currentVol / avgVol) * 100 : null;
    }

    return {
      symbol,
      price,
      change24h,
      rsi,
      macdHistogram,
      macdSignal,
      volumeRatio,
      volume24h,
    };
  } catch {
    return null;
  }
}

/**
 * Run a full scan cycle across all provided symbols.
 *
 * @param symbols - Array of `{ symbol, price, change24h, volume24h }` to scan.
 * @param onProgress - Called after each batch with (scanned, total).
 * @param abortSignal - AbortSignal to cancel the scan mid-cycle.
 * @returns Map of symbol → ScreenerResult.
 */
export async function runScreenerScan(
  symbols: { symbol: string; price: number; change24h: number; volume24h: number }[],
  onProgress?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<Map<string, ScreenerResult>> {
  const results = new Map<string, ScreenerResult>();
  const BATCH_SIZE = 10;
  const BATCH_DELAY = 300; // ms between batches

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    if (abortSignal?.aborted) break;

    const batch = symbols.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(s => scanSymbol(s.symbol, s.price, s.change24h, s.volume24h))
    );

    for (const result of batchResults) {
      if (result) results.set(result.symbol, result);
    }

    onProgress?.(Math.min(i + BATCH_SIZE, symbols.length), symbols.length);

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < symbols.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }

  return results;
}
