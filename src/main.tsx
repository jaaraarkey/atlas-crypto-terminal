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
