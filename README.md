# @xrpl-dex — Open Source DEX Toolkit for the XRP Ledger

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Security: Audited](https://img.shields.io/badge/Security-3x_Audited-brightgreen.svg)](#security)
[![Chains: 100+](https://img.shields.io/badge/Chains-100+-purple.svg)](#cross-chain-providers)
[![Wallets: 4](https://img.shields.io/badge/Wallets-4-orange.svg)](#wallets)
[![Themes: White--label](https://img.shields.io/badge/Themes-White--label-teal.svg)](#theming)

> Trade any XRPL token. Cross-chain to ETH, BTC, Lightning, and 100+ chains. Embeddable widget or headless SDK. White-label in 15 minutes.

```bash
npm install @xrpl-dex/core
```

---

## Table of Contents

- [What This Is](#what-this-is)
- [Feature Overview](#feature-overview)
- [Security](#security)
- [Quick Start](#quick-start)
- [Widget Props](#widget-props)
- [Components](#components)
- [React Hooks](#react-hooks)
- [Wallets](#wallets)
- [Cross-Chain Providers](#cross-chain-providers)
- [Theming](#theming)
- [OHLC Backend](#ohlc-backend)
- [Environment Variables](#environment-variables)
- [Source Map](#source-map)
- [Architecture](#architecture)
- [Compatibility](#compatibility)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What This Is

A complete, security-audited DEX toolkit built on the XRP Ledger's native on-chain exchange. No smart contracts. No bridges for same-chain swaps. No indexer — the ledger IS the order book.

Ships with a full React widget (~55KB gzipped), or use the headless SDK to build your own UI.

---

## Feature Overview

### Trading
- Market swaps (immediate fill-or-kill)
- Limit orders (rest on book until filled/cancelled)
- Cross-chain swaps to Ethereum, Bitcoin, Solana, and 100+ chains via [Squid Router](https://squidrouter.com)
- Bitcoin Lightning payments via [FixedFloat](https://ff.io) (one-step, non-custodial)
- Trust line detection — automatically prompts and waits for confirmation before swap
- XRPL auto-routes through DEX order book + AMM pools for best execution price
- Transaction preview with rate, fees, slippage, and price impact before signing
- Slippage tolerance: 0.5%, 1%, 3%, 5% (clamped 0-50% for safety)

### Chart
- Candlestick (OHLC) + volume histogram
- Independent range (1H, 24H, 7D, 30D, 90D, ALL) and candle size (5m, 15m, 1h, 4h, 1d, 1w)
- 7 technical indicators: SMA 20, EMA 9, EMA 21, Bollinger Bands, VWAP, RSI 14, MACD
- RSI and MACD in synced sub-panes below the main chart
- 5 drawing tools (fullscreen): Horizontal Line, Trend Line, Fibonacci Retracement, Rectangle, Ray
- Drawings persist to localStorage per pair
- Chart screenshot export (PNG)
- Fullscreen mode (Escape to exit)
- Crosshair with OHLC readout, zoom, pan
- Redis-backed OHLC backend with continuous 5m candle collection and on-demand aggregation

### Order Book
- Side-by-side bid/ask columns (desktop), stacked on mobile
- Price grouping/bucketing by precision level
- Order count badge per price level
- Cumulative depth bars + mini depth chart
- Click any price to fill limit order
- Precision toggle (2-5 decimal places)
- WebSocket live updates with 500ms debounced refresh
- 3s polling fallback

### Trade Feed
- WebSocket live trades with pulsing LIVE badge
- 5s polling fallback when WebSocket disconnects
- Flash animation on new trades
- Relative size bars
- AMM badge on automated market maker trades
- Counter currency badge for cross-pair trades
- Total buy/sell volume summary
- Last updated live timestamp

### Portfolio
- Trade history — user's own executed trades via `account_tx`
- Pagination, CSV export
- Open orders — view and cancel via OfferCancel
- Price alerts with browser notifications

### Cross-Chain

```
XRP  -->  Ethereum (ETH, USDC, USDT, DAI)
     -->  Bitcoin (BTC on-chain)
     -->  Bitcoin Lightning (via invoice)
     -->  Arbitrum, Base, Polygon, BNB Chain, Avalanche, Solana
```

- **Default provider**: Squid Router (9 audits, $6B+ volume, zero exploits, Ripple-endorsed)
- **Lightning provider**: FixedFloat (non-custodial, API keys server-side only)
- **Custom provider**: plug in any provider implementing the interface
- **Full audit trail**: XRPL tx hash + Axelar bridge tx hash + destination chain tx hash
- Quote expiry enforcement with countdown
- Destination address validation per chain type (EVM, BTC, Lightning invoice, Solana)

---

## Security

This codebase has been through 3 rounds of security audit (139 findings identified, all resolved).

### Protections in place

| Category | Protection |
|----------|-----------|
| **Input validation** | All amounts validated (finite, positive, bounded). All addresses checked against Base58 alphabet. All tx hashes validated against hex pattern. |
| **XSS prevention** | All hex-decoded currency names sanitised via `sanitiseTokenName()`. No dangerouslySetInnerHTML. |
| **API credentials** | FixedFloat API keys server-side only (HMAC-signed proxy). No secrets in browser code. |
| **Network** | All fetch calls use 10s timeout via `fetchWithTimeout()`. Xaman endpoints HTTPS-only validated. |
| **CSRF** | Origin header validation on all POST endpoints. Allowed origins whitelisted. |
| **Rate limiting** | Backend: 60 requests/minute/IP. Client: 2s throttle on refresh buttons. |
| **Injection** | Backend slug parameter validated against `/^[a-zA-Z0-9\-_\.]+$/`. URLs built with `new URL()` constructor (SSRF prevention). |
| **Financial** | Division-by-zero and Infinity checks on all price calculations. Slippage clamped 0-50%. Quote expiry enforced before execution. |
| **localStorage** | All stored data validated on load: favourites, alerts, drawings, cross-chain history. Prototype pollution guards. |
| **Error handling** | Error boundary catches render crashes. All polling wrapped in try-catch. Error messages sanitised (no status codes leaked). |
| **Transaction safety** | Destination tags validated 0-4294967295. Memos capped at 256 bytes. Trust line confirmation awaited before swap. GemWallet reads original tx flags. |
| **Wallet type** | Case-normalised. Window existence checked for browser extensions. |

---

## Quick Start

### Embed the Full DEX

```jsx
import { XrplDex } from '@xrpl-dex/widget';
import { dark } from '@xrpl-dex/themes';

<XrplDex
  theme={dark}
  walletAddress="rYourWallet"
  walletType="crossmark"
  isLoggedIn={true}
  liveUpdates={true}
  onSwapComplete={(txHash) => console.log('Swap:', txHash)}
/>
```

### Headless SDK

```javascript
import { fetchOrderBook, estimateSwap, buildSwapTx, XRP, RLUSD } from '@xrpl-dex/core';

const book = await fetchOrderBook(XRP, RLUSD);
const estimate = estimateSwap(book, 100);
const tx = buildSwapTx('rYourWallet', XRP, RLUSD, 100, estimate.output * 0.97);
// Sign tx with any XRPL wallet
```

### Cross-Chain Swap

```javascript
import { createSquidProvider, getQuote } from '@xrpl-dex/core';

const provider = createSquidProvider({ integratorId: 'your-id' });
const quote = await provider.getQuote({
  fromChain: 'xrpl',
  fromToken: 'XRP',
  fromAmount: '100',
  toChain: '1',        // Ethereum
  toToken: '0xEeee..', // ETH
  fromAddress: 'rYourXrplWallet',
  toAddress: '0xYourEthWallet',
});
// quote.exchangeRate, quote.fees, quote.estimatedTime
```

### Bitcoin Lightning

```javascript
import { createLightningProvider } from '@xrpl-dex/core';

const lightning = createLightningProvider();
const quote = await lightning.getQuote({ fromAmount: '50' });
const order = await lightning.createOrder({
  fromAmount: '50',
  toAddress: 'lnbc500n1p...', // Lightning invoice
});
// order.depositAddress — send XRP here
// order.orderId — poll for status
```

### Price Alerts

```javascript
import { usePriceAlerts } from '@xrpl-dex/react';

const { addAlert } = usePriceAlerts('XRP_RLUSD', currentPrice);
addAlert(2.50, 'above'); // Browser notification when price crosses 2.50
```

---

## Widget Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | Theme | dark | Theme preset or custom object |
| `defaultPair` | `{ base, quote }` | XRP/RLUSD | Initial trading pair |
| `walletAddress` | string | null | Connected wallet r-address |
| `walletType` | string | null | crossmark, gemwallet, xaman, soundbip |
| `isLoggedIn` | boolean | false | Wallet connected |
| `walletConfig` | object | {} | Wallet-specific (soundbipSdk, xamanEndpoint) |
| `crossChainProvider` | object | Squid | Cross-chain swap provider |
| `onConnectWallet` | function | - | Trigger wallet connection UI |
| `onBeforeSwap` | function | - | Optional pre-swap hook (e.g. custom validation) |
| `onSwapComplete` | function | - | Called with txHash on success |
| `xrplEndpoint` | string | /api/xrpl-rpc | XRPL JSON-RPC endpoint |
| `liveUpdates` | boolean | true | WebSocket order book |
| `refreshInterval` | number | 10000 | Polling interval (ms) |
| `compact` | boolean | false | Swap panel only |

---

## Components

| Component | Description |
|-----------|-------------|
| `<XrplDex />` | Full DEX — chart, order book, swap, trades, history, cross-chain |
| `<SwapPanel />` | Market + Limit + Cross-Chain swap interface |
| `<CrossChainPanel />` | Cross-chain swap with chain/token selectors and audit trail |
| `<OrderBookTable />` | Side-by-side order book with grouping and depth chart |
| `<PriceChart />` | Candlestick chart with 7 indicators, sub-panes, drawing tools |
| `<RecentTrades />` | WebSocket live trade feed |
| `<TradeHistory />` | User's executed trades with CSV export |
| `<OpenOrders />` | Open limit orders with cancel |
| `<TokenPicker />` | Token search with verification badges |
| `<PairHeader />` | 24h change, search, alerts, favourites |
| `<TransactionPreview />` | Confirmation modal before signing |
| `<DexErrorBoundary />` | Error boundary with retry |

---

## React Hooks

| Hook | Description |
|------|-------------|
| `useOrderBook` | Live order book with 3s polling |
| `useOrderBookWs` | WebSocket order book with polling fallback |
| `useSwap` | Swap state, estimation, transaction building |
| `useCrossChainSwap` | Cross-chain swap state, polling, audit trail |
| `usePriceAlerts` | Price alerts with browser notifications |
| `useKeyboardShortcuts` | F (flip), Enter (swap), M (max), Esc (clear) |
| `useFavouritePairs` | Favourite pairs persistence |

---

## Wallets

| Wallet | Type | Signing |
|--------|------|---------|
| **Xaman (XUMM)** | Mobile QR | Payload → QR → scan → sign on phone |
| **Crossmark** | Browser extension | `signAndSubmitAndWait` → instant |
| **GemWallet** | Browser extension | `createOffer` / `submitTransaction` → instant |
| **SoundBip** | Mobile QR/deep link | SDK session → QR → sign in app |

All return `{ success, txHash }` or `{ pending, uuid/qrUrl/deepLink }`.

---

## Cross-Chain Providers

| Provider | Chains | Trust Level | Use Case |
|----------|--------|------------|----------|
| **Squid Router** (default) | 100+ (ETH, BTC, SOL, etc.) | 9 audits, $6B+ volume | Production default |
| **FixedFloat Lightning** | BTC Lightning | Non-custodial, 0.5% fee | Lightning payments |
| **Custom** | Any | Your choice | Build your own adapter |

```jsx
// Custom provider
<XrplDex crossChainProvider={createCustomProvider({
  getQuote: async (params) => myProvider.quote(params),
  getStatus: async (hash) => myProvider.status(hash),
  getSupportedChains: async () => [...],
  getSupportedTokens: async (chain) => [...],
})} />
```

---

## Theming

4 presets + white-label. One config object reskins everything:

```javascript
import { applyTheme } from '@xrpl-dex/themes';

applyTheme(element, {
  colors: {
    primary: '#ff6b00',
    positive: '#00ff88',
    negative: '#ff0044',
    warning: '#ffaa00',
    background: '#111',
    surface: '#1a1a1a',
    text: '#fff',
    textSecondary: '#888',
    border: '#333',
  },
});
```

All components use `--dex-color-*` CSS custom properties. Zero hardcoded colours.

---

## OHLC Backend

Optional Redis-backed service for advanced charting:

- Continuously collects 5m candles for active tokens
- Each resolution stored separately (no mixing coarse/fine data)
- Aggregates on demand — any candle size over any range
- Coverage grows over time (day 1: what xrpl.to has; day 30: 30 days of 5m data)
- Adds to existing PM2 proxy — no new service
- Rate limited, slug validated, CSRF protected

Widget falls back to direct xrpl.to if backend unavailable.

---

## Architecture

```
Client (React widget or headless SDK)
├── @xrpl-dex/core ─── order book, swap, tokens, validation, cross-chain
├── @xrpl-dex/react ── hooks (order book, swap, alerts, favourites)
├── @xrpl-dex/wallets ─ Xaman, Crossmark, GemWallet, SoundBip
├── @xrpl-dex/themes ── 4 presets + white-label
└── @xrpl-dex/widget ── full embeddable React DEX

Backend (optional, PM2)
├── OHLC proxy ──── Redis-cached candles, 5m continuous collection
├── Lightning proxy ─ FixedFloat HMAC-signed (server-side only)
└── Rate limiter ──── 60 req/min/IP, CSRF Origin validation

XRPL (native protocol)
├── Central limit order book ── on-chain
├── Matching engine ──────── on-chain
├── AMM pools ──────────── auto-routed
├── Settlement ──────────── 3-5 seconds
├── Transaction cost ────── ~$0.00001
└── No MEV, no front-running, no smart contract risk

Cross-Chain
├── Squid Router (Axelar) ── 100+ chains, 9 audits
├── FixedFloat ───────────── BTC Lightning
└── Custom provider ─────── your own adapter
```

---

## Environment Variables

Required for the optional backend service (`onthedex-proxy.cjs`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | No | 127.0.0.1 | Redis server host |
| `REDIS_PORT` | No | 6379 | Redis server port |
| `REDIS_PASSWORD` | Production | - | Redis authentication password |
| `FIXEDFLOAT_API_KEY` | For Lightning | - | FixedFloat API key (server-side only) |
| `FIXEDFLOAT_API_SECRET` | For Lightning | - | FixedFloat HMAC secret (server-side only) |

The widget itself requires no environment variables. All configuration is via props.

---

## Source Map

```
packages/xrpl-dex/
├── src/
│   ├── core/
│   │   ├── tokens.js          # Token definitions, validation, fetchWithTimeout
│   │   ├── orderbook.js       # Order book fetch, swap estimation, AMM pool info
│   │   ├── swap.js            # Transaction builders (OfferCreate, TrustSet)
│   │   ├── wallet.js          # Wallet balance + trust line queries
│   │   ├── crosschain.js      # Cross-chain providers (Squid, Lightning, Custom)
│   │   └── logger.js          # Configurable logger (silent default)
│   ├── hooks/
│   │   ├── useOrderBook.js    # Polling-based order book
│   │   ├── useOrderBookWs.js  # WebSocket order book + fallback
│   │   ├── useSwap.js         # Swap state + estimation + tx building
│   │   ├── useCrossChainSwap.js # Cross-chain swap state + audit trail
│   │   ├── usePriceAlerts.js  # Price alerts + browser notifications
│   │   ├── useKeyboardShortcuts.js # F, Enter, M, Esc
│   │   └── useFavouritePairs.js # localStorage favourites
│   ├── wallets/
│   │   └── index.js           # Xaman, Crossmark, GemWallet, SoundBip adapters
│   ├── themes/
│   │   └── index.js           # 4 presets + applyTheme()
│   └── components/
│       ├── XrplDex.jsx        # Main widget (composes all components)
│       ├── SwapPanel.jsx      # Market + Limit + Cross-Chain tabs
│       ├── CrossChainPanel.jsx # Chain/token selector, audit trail
│       ├── OrderBookTable.jsx  # Side-by-side order book
│       ├── PriceChart.jsx     # Candlestick chart + indicators + drawings
│       ├── RecentTrades.jsx   # WebSocket live trade feed
│       ├── TradeHistory.jsx   # User's executed trades + CSV
│       ├── OpenOrders.jsx     # Open limit orders + cancel
│       ├── PairHeader.jsx     # 24h change, search, alerts, favourites
│       ├── TokenPicker.jsx    # Token search modal
│       ├── TransactionPreview.jsx # Confirmation modal
│       ├── ErrorBoundary.jsx  # Error boundary with retry
│       ├── XrplDex.css        # All styles (CSS custom properties)
│       └── index.js           # Public exports

functions/
└── onthedex-proxy.cjs         # OHLC backend + Lightning proxy + rate limiting
```

---

## Compatibility

| Environment | Support |
|------------|---------|
| **React** | 18+ |
| **Node.js** | 18+ (backend only) |
| **Browsers** | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ |
| **Mobile** | iOS Safari 15+, Chrome Android 90+ |
| **SSR** | Not supported (browser-only widget) |
| **TypeScript** | JSDoc typed (no .d.ts yet) |
| **Bundle size** | ~55KB gzipped (widget), ~8KB gzipped (core SDK only) |

---

## Troubleshooting

**Order book shows empty / "Loading..."**
- Check your XRPL endpoint is reachable. Default is `/api/xrpl-rpc` which requires a Vite proxy or backend.
- For direct access: pass `xrplEndpoint="https://xrplcluster.com"` (may hit CORS in browser).

**Chart shows "No chart data"**
- The chart uses xrpl.to OHLC API. Some new or low-volume tokens have no chart data.
- If using the OHLC backend, the first request seeds data — refresh after a few seconds.

**"Crossmark wallet not detected"**
- Crossmark browser extension must be installed and enabled on the current page.
- The widget checks `typeof window !== 'undefined' && window.crossmark`.

**Cross-chain swap stuck on "Processing"**
- Cross-chain swaps take 5-30 minutes depending on the destination chain.
- Check the Axelar transaction hash on [axelarscan.io](https://axelarscan.io) for status.
- If stuck >30 minutes, the swap may have been refunded to your XRPL address.

**"Quote has expired" error**
- Quotes are valid for 30 seconds (60 for Lightning). Click "Get Quote" again.

**Trust line error on swap**
- Some tokens require a trust line before you can hold them. The widget handles this automatically.
- If it fails, check you have at least 2 XRP available for the reserve.

**Lightning invoice rejected**
- Invoices must start with `lnbc` (mainnet) or `lntb` (testnet).
- Ensure the invoice hasn't expired.

**OHLC backend not responding**
- Check Redis is running and `REDIS_PASSWORD` is set correctly.
- The widget falls back to direct xrpl.to — charting still works without the backend.

---

## Roadmap

Everything below is shipped:

- [x] Core SDK (order book, swap, tokens, estimation, validation)
- [x] 7 React hooks
- [x] 4 wallet adapters (audited, flag-aware, timeout-protected)
- [x] Theme system (4 presets + white-label + warning colour)
- [x] Full embeddable widget
- [x] Order book (side-by-side, grouping, depth chart, WebSocket live)
- [x] Price chart (7 indicators, RSI/MACD sub-panes, 5 drawing tools, screenshot, fullscreen)
- [x] WebSocket live order book + live trades
- [x] Token verification badges
- [x] Trade history with CSV export
- [x] Open orders with cancel
- [x] Price alerts with browser notifications
- [x] 24h price change + token search
- [x] Keyboard shortcuts with legend
- [x] Favourite pairs
- [x] Cross-chain swaps (Squid Router — ETH, BTC, SOL, 100+ chains)
- [x] Bitcoin Lightning (FixedFloat — one-step, non-custodial)
- [x] Cross-chain provider abstraction (pluggable)
- [x] Full audit trail (XRPL + Axelar + destination tx hashes)
- [x] Error boundary, configurable logger
- [x] Input/address/amount validation + XSS prevention
- [x] Security audit (3 rounds, 22 fixes, 0 critical remaining)
- [x] Redis OHLC backend (continuous collection, resolution-tagged, aggregation)
- [x] Rate limiting, CSRF protection, HTTPS enforcement
- [ ] npm publish

---

## Contributing

Open source by [Lazy Jack Ltd](https://github.com/Lazy-Jack-Ltd). Contributions welcome.

```bash
git clone https://github.com/Lazy-Jack-Ltd/xrpl-dex.git
cd xrpl-dex
npm install
npm run dev
```

---

## License

MIT

---

## Links

- [XRPL Documentation](https://xrpl.org/)
- [book_offers API](https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/path-and-order-book-methods/book_offers)
- [OfferCreate](https://xrpl.org/docs/references/protocol/transactions/types/offercreate)
- [XRPL AMM](https://xrpl.org/docs/concepts/tokens/decentralized-exchange/automated-market-makers)
- [Squid Router](https://squidrouter.com) — Cross-chain provider
- [FixedFloat](https://ff.io) — Lightning provider

**Built by [Lazy Jack Ltd](https://github.com/Lazy-Jack-Ltd)** — finding and plugging leakage from island economies and beyond.
