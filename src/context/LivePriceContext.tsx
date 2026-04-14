import React, { createContext, useContext, useState, useEffect } from 'react';
import useWebSocketBase, { ReadyState } from 'react-use-websocket';
const useWebSocket = typeof useWebSocketBase === 'function' ? useWebSocketBase : (useWebSocketBase as any).default;

export interface TickerData {
  s: string; // Symbol
  c: string; // Current closing price
  p: string; // Price change
  P: string; // Price change percent
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
}

interface LivePriceContextType {
  tickers: Record<string, TickerData>;
  connectionStatus: string;
}

const LivePriceContext = createContext<LivePriceContextType | undefined>(undefined);

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/!ticker@arr';

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

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

  return (
    <LivePriceContext.Provider value={{ tickers, connectionStatus }}>
      {children}
    </LivePriceContext.Provider>
  );
}

export function useLivePrice() {
  const context = useContext(LivePriceContext);
  if (context === undefined) {
    throw new Error('useLivePrice must be used within a LivePriceProvider');
  }
  return context;
}
