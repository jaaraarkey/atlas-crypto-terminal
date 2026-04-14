/**
 * @file LivePriceContext.tsx
 * @description Global real-time price provider for the ATLAS Crypto Terminal.
 *
 * Opens a single WebSocket connection to the Binance combined ticker stream
 * (`wss://stream.binance.com:9443/ws/!ticker@arr`). This stream pushes
 * a full 24-hour rolling window ticker update for **every** listed pair
 * roughly 1–3 times per second.
 *
 * The provider maintains a flat `Record<symbol, TickerData>` map that is
 * merged on each incoming frame, giving every consumer component an
 * always-fresh price snapshot without needing its own WebSocket.
 *
 * Connection lifecycle is fully managed via `react-use-websocket`:
 *   - Auto-reconnects on drop (3 s backoff)
 *   - Exposes `connectionStatus` so the UI can show a live/dead indicator
 *
 * @example
 *   const { tickers, connectionStatus } = useLivePrice();
 *   const btcPrice = tickers['BTCUSDT']?.c;
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import useWebSocketBase, { ReadyState } from 'react-use-websocket';
const useWebSocket = typeof useWebSocketBase === 'function' ? useWebSocketBase : (useWebSocketBase as any).default;

/**
 * Shape of a single 24-hour ticker object from the Binance `!ticker@arr` stream.
 * @see https://binance-docs.github.io/apidocs/spot/en/#all-market-tickers-stream
 */
export interface TickerData {
  /** Symbol name, e.g. `"BTCUSDT"`. */
  s: string;
  /** Last (closing) price. */
  c: string;
  /** Absolute price change over 24 h. */
  p: string;
  /** Price change percentage over 24 h. */
  P: string;
  /** Total traded base-asset volume (e.g. BTC volume). */
  v: string;
  /** Total traded quote-asset volume (e.g. USDT volume). */
  q: string;
}

interface LivePriceContextType {
  /** Map of every ticker keyed by Binance symbol string. */
  tickers: Record<string, TickerData>;
  /** Human-readable WebSocket status: `"Open"`, `"Closed"`, etc. */
  connectionStatus: string;
}

const LivePriceContext = createContext<LivePriceContextType | undefined>(undefined);

/** Binance public WebSocket endpoint — all tickers in one stream, no auth required. */
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/!ticker@arr';

/**
 * LivePriceProvider — opens the global Binance ticker WebSocket and exposes
 * `tickers` + `connectionStatus` to every descendant via React Context.
 */
export function LivePriceProvider({ children }: { children: React.ReactNode }) {
  const [tickers, setTickers] = useState<Record<string, TickerData>>({});
  
  const { lastJsonMessage, readyState } = useWebSocket(BINANCE_WS_URL, {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
  });

  useEffect(() => {
    if (lastJsonMessage && Array.isArray(lastJsonMessage)) {
      setTickers((prev) => {
        const next = { ...prev };
        // lastJsonMessage is an array of 24hr mini-ticker objects
        for (const t of lastJsonMessage) {
          next[t.s] = t;
        }
        return next;
      });
    }
  }, [lastJsonMessage]);

  const statusMap: Record<number, string> = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  };
  const connectionStatus = statusMap[readyState as number] ?? 'Unknown';

  return (
    <LivePriceContext.Provider value={{ tickers, connectionStatus }}>
      {children}
    </LivePriceContext.Provider>
  );
}

/**
 * useLivePrice — convenience hook to consume LivePriceContext.
 * @throws {Error} If called outside of a `<LivePriceProvider>`.
 */
export function useLivePrice() {
  const context = useContext(LivePriceContext);
  if (context === undefined) {
    throw new Error('useLivePrice must be used within a LivePriceProvider');
  }
  return context;
}
