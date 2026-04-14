/**
 * @file main.tsx
 * @description Application entry point for the ATLAS Crypto Terminal.
 *
 * Bootstraps the React tree with all required global providers in strict
 * dependency order:
 *
 *   ThemeProvider  → Manages dark/light mode (no deps)
 *   WatchlistProvider → Manages saved trading pairs (no deps)
 *   LivePriceProvider → Opens a single global Binance WebSocket (no deps)
 *
 * The provider ordering is intentional: LivePriceProvider sits innermost
 * so that it mounts last and the WebSocket connection only opens once
 * the rest of the UI tree is ready to consume ticker data.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { WatchlistProvider } from './context/WatchlistContext.tsx';
import { LivePriceProvider } from './context/LivePriceContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <WatchlistProvider>
        <LivePriceProvider>
          <App />
        </LivePriceProvider>
      </WatchlistProvider>
    </ThemeProvider>
  </StrictMode>
);
