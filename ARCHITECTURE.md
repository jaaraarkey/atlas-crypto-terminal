# ATLAS — Architecture Overview

This document describes the technical architecture of the **ATLAS Crypto Terminal** for developers who want to understand, extend, or contribute to the project.

---

## Directory Structure

```
src/
├── api/
│   └── coingecko.ts          # CoinGecko REST client with localStorage caching
├── components/
│   ├── CandlestickChart.tsx   # Live K-line chart (lightweight-charts v5)
│   ├── CoinDashboard.tsx      # Top coins ranking table (CoinGecko + Binance)
│   ├── GlassNavbar.tsx        # Sticky glassmorphism navigation bar
│   ├── LiveTickerCard.tsx     # Watchlist price card widget
│   ├── OrderbookView.tsx      # Real-time Level 2 orderbook depth
│   ├── ScreenerView.tsx       # Advanced market screener with filter toggles
│   └── SymbolDetails.tsx      # Full trading terminal page (chart + orderbook)
├── context/
│   ├── LivePriceContext.tsx    # Global Binance WebSocket ticker provider
│   ├── ThemeContext.tsx        # Dark/light mode manager
│   └── WatchlistContext.tsx    # User's favourite pairs manager
├── App.tsx                    # Root component with route definitions
├── index.css                  # Design system tokens + Tailwind v4 config
└── main.tsx                   # Entry point + provider composition
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ATLAS CLIENT                                │
│                                                                     │
│  ┌───────────────┐          ┌──────────────────────────────────┐    │
│  │   CoinGecko   │  REST    │       localStorage Cache         │    │
│  │   Free API    │ ──────►  │  (5-min TTL, stale-on-error)     │    │
│  └───────────────┘          └──────────────────────────────────┘    │
│                                        │                            │
│                                        ▼                            │
│                             ┌──────────────────┐                    │
│                             │  CoinDashboard   │                    │
│                             │  (Rankings Table) │                    │
│                             └──────────────────┘                    │
│                                                                     │
│  ┌───────────────┐          ┌──────────────────────────────────┐    │
│  │    Binance    │    WS    │      LivePriceContext             │    │
│  │  !ticker@arr  │ ──────►  │  (Global ticker map, all pairs)  │    │
│  └───────────────┘          └──────────────────────────────────┘    │
│                                        │                            │
│                             ┌──────────┴───────────┐                │
│                             ▼                      ▼                │
│                    ┌─────────────────┐   ┌──────────────────┐       │
│                    │ LiveTickerCard  │   │   ScreenerView   │       │
│                    │ (Watchlist)     │   │   (Filter Engine) │       │
│                    └─────────────────┘   └──────────────────┘       │
│                                                                     │
│  ┌───────────────┐          ┌──────────────────────────────────┐    │
│  │    Binance    │    WS    │      CandlestickChart            │    │
│  │ @kline_<int>  │ ──────►  │  (Per-symbol live candles)       │    │
│  └───────────────┘          └──────────────────────────────────┘    │
│                                                                     │
│  ┌───────────────┐          ┌──────────────────────────────────┐    │
│  │    Binance    │    WS    │      OrderbookView               │    │
│  │ @depth20      │ ──────►  │  (Level 2 bid/ask walls)         │    │
│  └───────────────┘          └──────────────────────────────────┘    │
│                                                                     │
│  ┌───────────────┐          ┌──────────────────────────────────┐    │
│  │    Binance    │   REST   │      CandlestickChart            │    │
│  │ /api/v3/klines│ ──────►  │  (Historical backfill, 1000 bars)│    │
│  └───────────────┘          └──────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Provider Hierarchy

Providers are composed in `main.tsx` in dependency order:

```
<StrictMode>
  <ThemeProvider>         ← manages dark/light CSS class on <html>
    <WatchlistProvider>   ← persists favourite pairs to localStorage
      <LivePriceProvider> ← opens single global Binance WS connection
        <App />
      </LivePriceProvider>
    </WatchlistProvider>
  </ThemeProvider>
</StrictMode>
```

---

## API Strategy

| Source | Protocol | Auth Required | Rate Limit Protection |
|--------|----------|---------------|----------------------|
| Binance Ticker Stream | WebSocket | No | N/A (push-based) |
| Binance K-lines | REST | No | 1200 req/min (generous) |
| Binance Depth Stream | WebSocket | No | N/A (push-based) |
| CoinGecko Markets | REST | No | ~10-30 req/min → **5-min localStorage cache** |

---

## Design System

The visual language is defined in `src/index.css`:

- **Color tokens** — Declared via Tailwind v4 `@theme {}` and CSS custom properties.
- **Glassmorphism** — `.glass-panel` applies `backdrop-filter: blur(12px)` with adaptive dark/light backgrounds.
- **Neon effects** — `.text-neon` and `.border-neon` provide the signature teal glow.
- **Theme switching** — Adding/removing `.dark` on `<html>` toggles the full palette.
