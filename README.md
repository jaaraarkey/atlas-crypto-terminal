<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" width="100" height="100" alt="React Logo" />
  <h1>ATLAS Trading Terminal ⚡</h1>
  <p><strong>A high-performance, institutional-grade cryptocurrency trading terminal and screener.</strong></p>
</div>

<br>

## 🚀 Overview

**ATLAS** (Advanced Trading Liquidity & Analytics Screener) is a lightning-fast React trading terminal designed to give you continuous, real-time insights into the cryptocurrency market. 

Built with extremely strict architectural separation, ATLAS utilizes **CoinGecko's REST API** for robust fundamental analysis and state persistence alongside **Binance's WebSocket Streams** for instantaneous tick-level charting. All of this runs perfectly in the browser without locking out free-tier API limits.

## ✨ Core Features

### 📡 Dual-API Architecture
- **CoinGecko REST Engine**: Pulls the top highly-liquid assets by strict market cap using safely cached `localStorage` interceptors.
- **Binance WebSocket Global Provider**: Subscribed to the complete `!ticker@arr` raw socket, rendering live price action on your Watchlist without HTTP delay.

### 📈 Advanced Charting (Lightweight Charts v5)
- **Live Candlestick Syncing**: Fully synchronized K-lines that pull up to 1000 historic intervals upon mount and seamlessly inherit live candlestick ticks from the `<symbol>@kline_<interval>` stream. All intervals (1m -> 1Mo) are natively parsed.
- **Deep Orderbook View**: Directly consumes the Binance `@depth20@100ms` stream to render blazing-fast buy/sell depth walls.

### 🧠 Tactical Analytics
- **Live Background Screener**: A comprehensive analysis panel that actively scans the highly-liquid market against modular technical indicators (RSI Oscillators, MACD Crosses, Volume Spikes).
- **Persistent State**: Your dynamic Watchlists and custom Dark/Light Glassmorphism themes belong strictly to you—saved safely on your local client via React Context.

## 🛠️ Technology Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (Using the new aggressive `@theme` variables for deep Glassmorphism UI)
- **Routing:** React Router v7
- **Charting Engine:** TradingView `lightweight-charts`
- **WebSockets:** `react-use-websocket`
- **Icons:** Lucide React

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/jaaraarkey/atlas-crypto-terminal.git
cd atlas-crypto-terminal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Build for Production
To generate a highly-optimized, static bundle ready for deployment:
```bash
npm run build
```

## 🔒 Security & Privacy

ATLAS was designed as a zero-trust frontend. 
- You do **not** need to input your private Binance API keys. 
- You do **not** need a paid CoinGecko API key. 
- Everything strictly consumes public Read-Only streams so you can watch algorithmic price action entirely risk-free.

---

<div align="center">
  <i>Engineered for peak web performance.</i>
</div>
