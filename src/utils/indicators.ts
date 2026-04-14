/**
 * @file indicators.ts
 * @description Pure math functions for computing technical indicators from OHLCV data.
 *
 * All functions are stateless and operate on plain number arrays, making them
 * easy to test and reuse across the chart overlay and the screener engine.
 *
 * Supported indicators:
 *   - SMA  (Simple Moving Average)
 *   - EMA  (Exponential Moving Average)
 *   - RSI  (Relative Strength Index, Wilder's smoothing)
 *   - MACD (Moving Average Convergence Divergence)
 *   - Bollinger Bands (Middle ± N standard deviations)
 */

// ── Simple Moving Average ──────────────────────────────────────────────

/**
 * Compute Simple Moving Average for a given period.
 * @param data   - Array of closing prices.
 * @param period - Lookback window (e.g. 20, 50, 200).
 * @returns Array of `{ index, value }` starting from `period - 1`.
 */
export function calculateSMA(data: number[], period: number): { index: number; value: number }[] {
  const result: { index: number; value: number }[] = [];
  if (data.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result.push({ index: period - 1, value: sum / period });

  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    result.push({ index: i, value: sum / period });
  }
  return result;
}

// ── Exponential Moving Average ─────────────────────────────────────────

/**
 * Compute Exponential Moving Average for a given period.
 * Uses the standard multiplier: `2 / (period + 1)`.
 * @param data   - Array of closing prices.
 * @param period - Lookback window (e.g. 12, 26).
 * @returns Array of `{ index, value }`.
 */
export function calculateEMA(data: number[], period: number): { index: number; value: number }[] {
  const result: { index: number; value: number }[] = [];
  if (data.length < period) return result;

  const multiplier = 2 / (period + 1);

  // Seed with SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  let ema = sum / period;
  result.push({ index: period - 1, value: ema });

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
    result.push({ index: i, value: ema });
  }
  return result;
}

// ── Relative Strength Index (Wilder's smoothing) ───────────────────────

/**
 * Compute RSI using Wilder's smoothed moving averages.
 * @param data   - Array of closing prices.
 * @param period - Lookback window (default 14).
 * @returns Array of `{ index, value }` where value is 0–100.
 */
export function calculateRSI(data: number[], period: number = 14): { index: number; value: number }[] {
  const result: { index: number; value: number }[] = [];
  if (data.length < period + 1) return result;

  // Calculate initial average gain and loss over the first `period` changes
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // First RSI value
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ index: period, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + rs) });

  // Subsequent values using Wilder's smoothing
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rsNow = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ index: i, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + rsNow) });
  }
  return result;
}

// ── MACD ───────────────────────────────────────────────────────────────

export interface MACDResult {
  index: number;
  macd: number;
  signal: number;
  histogram: number;
}

/**
 * Compute MACD (12, 26, 9) from closing prices.
 * @param data - Array of closing prices.
 * @returns Array of `{ index, macd, signal, histogram }`.
 */
export function calculateMACD(data: number[]): MACDResult[] {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  if (ema12.length === 0 || ema26.length === 0) return [];

  // Build MACD line (EMA12 - EMA26), aligned by index
  const ema26StartIndex = ema26[0].index;
  const macdLine: { index: number; value: number }[] = [];

  for (const e12 of ema12) {
    if (e12.index < ema26StartIndex) continue;
    const e26 = ema26.find(e => e.index === e12.index);
    if (e26) {
      macdLine.push({ index: e12.index, value: e12.value - e26.value });
    }
  }

  // Signal line = EMA(9) of MACD line
  const macdValues = macdLine.map(m => m.value);
  const signalEma = calculateEMA(macdValues, 9);
  if (signalEma.length === 0) return [];

  const result: MACDResult[] = [];
  const signalOffset = signalEma[0].index;

  for (let i = 0; i < signalEma.length; i++) {
    const macdIdx = signalOffset + i;
    if (macdIdx < macdLine.length) {
      const m = macdLine[macdIdx].value;
      const s = signalEma[i].value;
      result.push({
        index: macdLine[macdIdx].index,
        macd: m,
        signal: s,
        histogram: m - s,
      });
    }
  }
  return result;
}

// ── Bollinger Bands ────────────────────────────────────────────────────

export interface BollingerResult {
  index: number;
  upper: number;
  middle: number;
  lower: number;
}

/**
 * Compute Bollinger Bands (default 20-period, 2 std deviations).
 * @param data   - Array of closing prices.
 * @param period - SMA lookback (default 20).
 * @param stdDev - Number of standard deviations (default 2).
 * @returns Array of `{ index, upper, middle, lower }`.
 */
export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerResult[] {
  const sma = calculateSMA(data, period);
  const result: BollingerResult[] = [];

  for (const point of sma) {
    const slice = data.slice(point.index - period + 1, point.index + 1);
    const mean = point.value;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);

    result.push({
      index: point.index,
      upper: mean + stdDev * sd,
      middle: mean,
      lower: mean - stdDev * sd,
    });
  }
  return result;
}
