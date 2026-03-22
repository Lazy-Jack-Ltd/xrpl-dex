# @xrpl-dex — Open Source XRPL DEX Toolkit

> Swap tokens, read order books, estimate trades, and build transactions — all from a single SDK. No smart contracts. No indexers. Just the native XRPL DEX, wrapped in a clean API.

```bash
npm install @xrpl-dex/core
```

---

## Why This Exists

The XRP Ledger has a **native decentralized exchange built into the protocol** — order books, matching engine, and settlement all on-ledger. No other blockchain has this.

But there's no good open source toolkit for building on it. Every XRPL DEX project either died after a few commits, only supports CLI, or is a closed-source product.

**@xrpl-dex changes that.** One package. MIT licensed. Works in any JavaScript environment.

---

## Status

| Component | Status | Description |
|-----------|--------|-------------|
| `@xrpl-dex/core` | **Available** | Order book, swap estimation, transaction building, token registry, validation |
| `@xrpl-dex/react` | **Available** | React hooks (`useOrderBook`, `useOrderBookWs`, `useSwap`, `usePriceAlerts`, `useKeyboardShortcuts`, `useFavouritePairs`) |
| `@xrpl-dex/wallets` | **Available** | Wallet adapters (Xaman, Crossmark, GemWallet, SoundBip) |
| `@xrpl-dex/widget` | **Available** | Full embeddable React DEX with chart, order book, swap, trade history |
| `@xrpl-dex/themes` | **Available** | 4 pre-built themes (dark, light, midnight, emerald) + white-label |

---

## Widget Features

### Chart
- Candlestick (OHLC) + volume histogram
- Independent range (1H, 24H, 7D, 30D, 90D, ALL) and candle size (5m, 15m, 1h, 4h, 1d, 1w) selectors
- 7 technical indicators: SMA 20, EMA 9, EMA 21, Bollinger Bands, VWAP, RSI 14, MACD
- RSI and MACD render in synced sub-panes below the main chart
- 7 drawing tools (fullscreen): horizontal line, trend line, Fibonacci retracement, rectangle, ray, clear
- Drawings persist to localStorage per pair
- Chart screenshot export (PNG download)
- Fullscreen mode with Escape to exit
- Crosshair with OHLC readout
- Zoom (mouse wheel) and pan (click+drag)
- Data via Redis-cached OHLC backend with continuous 5m candle collection
- Falls back to xrpl.to direct if backend unavailable

### Order Book
- Side-by-side bid/ask columns (desktop), stacked on mobile
- Price grouping/bucketing by precision level (like Binance)
- Order count badge per level
- Cumulative depth bars
- Mini depth chart visualisation
- Click to fill limit order price
- Precision toggle (2-5 decimal places)
- WebSocket live updates with debounced refresh
- Polling fallback (3s interval)

### Swap Panel
- Market and limit order modes
- 25% / 50% / Max quick buttons
- Slippage tolerance selector (0.5%, 1%, 3%, 5%)
- Minimum received after slippage display
- Price impact warning (medium/high)
- Insufficient balance detection with red border
- Trust line detection + add trust line button
- Transaction preview confirmation modal
- Network fee display
- Auto-routing display (DEX + AMM)
- QR/deep link signing for Xaman/SoundBip

### Recent Trades
- WebSocket live trade feed with green pulsing LIVE badge
- Falls back to 5s polling when WebSocket disconnects
- Flash animation on new trades
- Relative size bars
- AMM badge on automated market maker trades
- Counter currency badge for cross-pair trades
- Total buy/sell volume summary
- Last updated live timestamp
- Click to open on XRPL Explorer

### Trade History
- User's own executed trades via `account_tx`
- Columns: Date, Pair, Side, Price, Amount, Total, Status, TX link
- Pagination (20 trades per page)
- CSV export for compliance and accounting
- Auto-refresh every 60 seconds
- Mobile responsive (hides columns under 600px)

### Open Orders
- View all open limit orders
- Cancel via OfferCancel transaction
- Auto-refresh every 30 seconds

### Pair Header
- 24h price change percentage (green/red badge)
- Quick token search (opens picker, switches base token)
- Price alerts with browser notifications (bell icon)
- Favourite pairs with localStorage persistence

### Keyboard Shortcuts
- `F` — Flip pair
- `Enter` — Execute swap
- `M` — Max amount
- `Esc` — Clear amount
- `?` button in footer shows shortcut legend

### Infrastructure
- Error boundary with retry button
- Configurable logger (`setLogger()` — silent by default, inject Sentry/console)
- Input validation (`validateAmount`, `isValidXrplAddress`)
- XSS prevention (`sanitiseTokenName`)
- Mandatory compliance mode (`requireCompliance` prop)
- Data freshness indicator with staleness warning
- WCAG 2.1 AA accessibility (aria labels, roles, keyboard navigation)

---

## Quick Start

### Fetch an Order Book

```javascript
import { fetchOrderBook, XRP, RLUSD } from '@xrpl-dex/core';

const book = await fetchOrderBook(XRP, RLUSD);
console.log(`Mid price: ${book.midPrice}`);
console.log(`Spread: ${book.spread?.toFixed(2)}%`);
console.log(`Best ask: ${book.bestAsk}`);
console.log(`Best bid: ${book.bestBid}`);
console.log(`${book.asks.length} asks, ${book.bids.length} bids`);
```

### Estimate a Swap

```javascript
import { fetchOrderBook, estimateSwap, XRP, RLUSD } from '@xrpl-dex/core';

const book = await fetchOrderBook(XRP, RLUSD);
const estimate = estimateSwap(book, 100); // Sell 100 XRP

console.log(`You'd receive: ${estimate.output.toFixed(2)} RLUSD`);
console.log(`Average price: ${estimate.avgPrice.toFixed(4)}`);
console.log(`Price impact: ${estimate.priceImpact.toFixed(2)}%`);
console.log(`Fully filled: ${!estimate.partial}`);
```

### Build a Swap Transaction

```javascript
import { buildSwapTx, XRP, RLUSD } from '@xrpl-dex/core';

const tx = buildSwapTx(
  'rYourWalletAddress',  // Account
  XRP,                    // Sell token
  RLUSD,                  // Buy token
  100,                    // Sell amount
  95.5                    // Min receive (slippage protection)
);

// tx is an unsigned OfferCreate with tfImmediateOrCancel
// Sign it with any wallet: Xaman, Crossmark, GemWallet, Web3Auth, xrpl.js
```

### Build a Limit Order

```javascript
import { buildLimitOrderTx, XRP, RLUSD } from '@xrpl-dex/core';

const tx = buildLimitOrderTx(
  'rYourWalletAddress',
  XRP,      // Selling
  RLUSD,    // Buying
  100,      // Sell 100 XRP
  250       // At 2.50 RLUSD per XRP
);

// Stays on the XRPL order book until filled or cancelled
```

### Embed the Widget

```jsx
import { XrplDex } from '@xrpl-dex/widget';
import { dark } from '@xrpl-dex/themes';

function App() {
  return (
    <XrplDex
      theme={dark}
      walletAddress="rYourWallet"
      walletType="crossmark"
      isLoggedIn={true}
      liveUpdates={true}
      requireCompliance={false}
      onSwapComplete={(txHash) => console.log('Swap:', txHash)}
    />
  );
}
```

### React Hooks

```jsx
import { useOrderBook, useSwap } from '@xrpl-dex/react';
import { XRP, RLUSD } from '@xrpl-dex/core';

function SwapPanel() {
  const { orderBook, loading } = useOrderBook(XRP, RLUSD, { refreshInterval: 3000 });
  const { estimate, sellAmount, setSellAmount, canSwap, buildTransaction } = useSwap(XRP, RLUSD, orderBook);

  return (
    <div>
      <input value={sellAmount} onChange={e => setSellAmount(e.target.value)} placeholder="Amount" />
      {estimate && <p>You'll receive: {estimate.output.toFixed(2)} RLUSD</p>}
      <button disabled={!canSwap} onClick={() => {
        const tx = buildTransaction('rYourWallet');
        // Sign tx with your wallet of choice
      }}>
        Swap
      </button>
    </div>
  );
}
```

### Price Alerts

```javascript
import { usePriceAlerts } from '@xrpl-dex/react';

const { alerts, addAlert, removeAlert, clearAlerts } = usePriceAlerts(
  'XRP_RLUSD',
  currentMidPrice,
  { onAlert: (alert) => console.log('Price alert triggered:', alert) }
);

addAlert(2.50, 'above'); // Alert when price goes above 2.50
```

### Wallet Signing

```javascript
import { signAndSubmitTx, pollXamanResult } from '@xrpl-dex/wallets';

// Crossmark (instant — browser extension)
const result = await signAndSubmitTx('crossmark', tx);
console.log(result.txHash);

// GemWallet (instant — browser extension)
const result = await signAndSubmitTx('gemwallet', tx);
console.log(result.txHash);

// Xaman (QR code — user scans with phone)
const result = await signAndSubmitTx('xaman', tx);
if (result.pending) {
  // Show QR: result.qrUrl
  // Poll for completion:
  const interval = setInterval(async () => {
    const status = await pollXamanResult(result.uuid);
    if (status?.success) {
      clearInterval(interval);
      console.log('Swap complete:', status.txHash);
    }
  }, 2000);
}
```

---

## API Reference

### Core (`@xrpl-dex/core`)

#### Tokens

| Export | Type | Description |
|--------|------|-------------|
| `XRP` | Token | Native XRP token |
| `RLUSD` | Token | Ripple USD stablecoin |
| `USDC` | Token | USD Coin (Bitstamp) |
| `DEFAULT_TOKENS` | Token[] | [XRP, RLUSD, USDC] |
| `fetchXrplTokens()` | async → Token[] | Fetch top 200 from XRPScan (30min cache) |
| `findToken(currency, issuer)` | Token \| undefined | Look up registered token |
| `registerToken(token)` | void | Add custom token to registry |
| `xrpToDrops(xrp)` | string | Convert XRP to drops |
| `dropsToXrp(drops)` | number | Convert drops to XRP |
| `toXrplAmount(token, value)` | Amount | Build XRPL amount object |
| `isValidXrplAddress(address)` | boolean | Validate XRPL r-address format |
| `validateAmount(value)` | `{ valid, amount, error? }` | Validate and parse trade amount |
| `sanitiseTokenName(name)` | string | Strip XSS characters from token names |

#### Order Book

| Export | Type | Description |
|--------|------|-------------|
| `fetchOrderBook(sell, buy, options?)` | async → OrderBook | Fetch live order book from XRPL |
| `estimateSwap(book, amount, options?)` | SwapEstimate \| null | Calculate expected output from order book |
| `fetchAmmPool(sell, buy, options?)` | async → AmmPool \| null | Fetch AMM pool info (balances, fee, implied price) |

#### Transactions

| Export | Type | Description |
|--------|------|-------------|
| `buildSwapTx(account, sell, buy, amount, minOutput)` | OfferCreate | Market swap (fill-or-kill) |
| `buildLimitOrderTx(account, sell, buy, amount, price)` | OfferCreate | Limit order (stays on book) |
| `buildTrustSetTx(account, token, options?)` | TrustSet \| null | Enable a token (configurable limit) |
| `needsTrustLine(walletStatus, token)` | boolean | Check if trust line needed |
| `checkLedgerResult(engineResult)` | void \| throws | Validate XRPL transaction result |

#### Wallet

| Export | Type | Description |
|--------|------|-------------|
| `getWalletStatus(address, options?)` | async → WalletStatus | Balances + trust lines (via API) |
| `getWalletBalanceDirect(address, endpoint?)` | async → Balances | Direct XRPL query (no backend) |

#### Logger

| Export | Type | Description |
|--------|------|-------------|
| `setLogger(logger)` | void | Inject custom logger (Sentry, console, etc.) |

### React Hooks (`@xrpl-dex/react`)

| Hook | Returns | Description |
|------|---------|-------------|
| `useOrderBook(sell, buy, options?)` | `{ orderBook, loading, error, refresh, estimate }` | Live order book with 3s polling |
| `useOrderBookWs(sell, buy, options?)` | `{ orderBook, loading, error, refresh, estimate, wsConnected }` | WebSocket order book with polling fallback |
| `useSwap(sell, buy, book, options?)` | `{ estimate, sellAmount, setSellAmount, canSwap, buildTransaction, flipPair, ... }` | Swap state management |
| `usePriceAlerts(pairKey, price, options?)` | `{ alerts, addAlert, removeAlert, clearAlerts }` | Price alerts with browser notifications |
| `useKeyboardShortcuts(options)` | void | Global keyboard shortcuts (F, Enter, M, Esc) |
| `useFavouritePairs()` | `{ favourites, isFavourite, toggleFavourite }` | Favourite pairs persistence |

### Widget (`@xrpl-dex/widget`)

| Component | Description |
|-----------|-------------|
| `<XrplDex />` | Full embeddable DEX (chart, order book, swap, trades, history) |
| `<SwapPanel />` | Standalone swap interface |
| `<OrderBookTable />` | Order book with depth bars and price grouping |
| `<PriceChart />` | Candlestick chart with indicators and drawing tools |
| `<RecentTrades />` | Live trade feed with WebSocket |
| `<TradeHistory />` | User's executed trades with CSV export |
| `<OpenOrders />` | Open limit orders with cancel |
| `<TokenPicker />` | Token search modal with verification badges |
| `<PairHeader />` | Pair info with 24h change, alerts, search, favourites |
| `<TransactionPreview />` | Swap confirmation modal |
| `<DexErrorBoundary />` | Error boundary with retry |

### Widget Props (`<XrplDex />`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | Theme | dark | Theme object or preset |
| `defaultPair` | `{ base, quote }` | XRP/RLUSD | Initial trading pair |
| `walletAddress` | string | null | Connected wallet address |
| `walletType` | string | null | 'crossmark' \| 'gemwallet' \| 'xaman' \| 'soundbip' |
| `isLoggedIn` | boolean | false | Whether wallet is connected |
| `walletConfig` | object | {} | Wallet-specific config (soundbipSdk, xamanEndpoint) |
| `onConnectWallet` | function | - | Called when user clicks "Connect Wallet" |
| `onBeforeSwap` | function | - | Compliance hook — called before swap execution |
| `requireCompliance` | boolean | false | Block swaps if onBeforeSwap not configured |
| `onSwapComplete` | function | - | Called with txHash after successful swap |
| `xrplEndpoint` | string | /api/xrpl-rpc | XRPL JSON-RPC endpoint |
| `liveUpdates` | boolean | true | Use WebSocket for live order book |
| `refreshInterval` | number | 10000 | Polling interval (ms) when not using WebSocket |
| `compact` | boolean | false | Minimal mode (swap panel only) |
| `className` | string | '' | Additional CSS class |

### Wallet Adapters (`@xrpl-dex/wallets`)

| Export | Description |
|--------|-------------|
| `signAndSubmitTx(type, tx, config?)` | Route to correct wallet (crossmark, gemwallet, xaman, soundbip) |
| `pollXamanResult(uuid, config?)` | Poll Xaman for signing result |
| `pollSoundbipResult(txId, config?)` | Poll SoundBip for signing result |

### Themes (`@xrpl-dex/themes`)

| Export | Description |
|--------|-------------|
| `dark` | Dark theme (violet accent) |
| `light` | Light theme (blue accent) |
| `midnight` | Navy theme (cyan accent) |
| `emerald` | Green theme (emerald accent) |
| `applyTheme(element, theme)` | Apply CSS custom properties to DOM element |

---

## Architecture

```
@xrpl-dex/core
├── No blockchain node required — uses XRPL JSON-RPC (HTTP)
├── No smart contracts — native XRPL DEX protocol
├── No indexer — the ledger IS the order book
├── No backend required — works entirely client-side
├── Framework-agnostic — vanilla JS, React, Vue, Node.js
└── Zero dependencies (only peer: xrpl.js optional)

XRPL DEX (native to the ledger)
├── Central limit order book — on-chain
├── Matching engine — on-chain
├── Auto-routing through DEX + AMM for best price
├── Settlement — 3-5 seconds
├── Transaction cost — ~$0.00001
└── No MEV, no front-running, no smart contract risk
```

---

## OHLC Backend (Optional)

For institutional-grade charting with any candle size over any range, an optional Redis-backed OHLC service is included:

- Continuously collects 5m candles from xrpl.to for active tokens
- Stores each resolution (5m, 15m, 1h, 4h, 1d, 1w) in separate Redis sorted sets
- Aggregates smaller candles into larger ones on demand
- Serves any combination of range + candle size
- Coverage grows over time as the collector runs
- Adds to existing Express/PM2 proxy — no new service needed

The widget falls back to direct xrpl.to if the backend is unavailable.

---

## Supported Wallets

| Wallet | Type | How It Works |
|--------|------|-------------|
| **Xaman (XUMM)** | Mobile (QR) | SDK creates payload → QR displayed → user scans → signs on phone |
| **Crossmark** | Browser extension | Direct `signAndSubmitAndWait` call → instant |
| **GemWallet** | Browser extension | `createOffer` / `submitTransaction` API → instant |
| **SoundBip** | Mobile (QR/deep link) | SDK session → QR/deep link → signs in app → polls for result |

All wallets return the same interface: `{ success: true, txHash: '...' }` or `{ pending: true, uuid/qrUrl/deepLink }`.

---

## Token Support

**Built-in:** XRP, RLUSD, USDC

**Dynamic:** Fetches top 200 tokens from [XRPScan API](https://xrpscan.com) with 30-minute cache. Token names are sanitised against XSS. Issuer addresses are validated.

**Verified:** Tokens from known issuers show a verification badge. Unverified tokens show a caution icon.

**Custom:** Register any XRPL token at runtime:

```javascript
import { registerToken } from '@xrpl-dex/core';

registerToken({
  currency: 'DROP',
  name: 'DROP',
  icon: 'D',
  issuer: 'rszenFJoDdiGjyezQc8pME9KWDQH43Tswh',
  currencyHex: '44524F5000000000000000000000000000000000',
});
```

---

## Configuration

All endpoints are configurable — no hardcoded dependencies:

```javascript
// Order book from a different XRPL node
const book = await fetchOrderBook(XRP, RLUSD, {
  endpoint: 'https://s1.ripple.com',
  limit: 50,
});

// Wallet status from your own backend
const status = await getWalletStatus(address, {
  apiEndpoint: 'https://your-api.com',
});

// Direct XRPL query (no backend needed)
const balance = await getWalletBalanceDirect(address, 'wss://s2.ripple.com');

// Custom logger
import { setLogger } from '@xrpl-dex/core';
setLogger(console); // or setLogger({ error: (msg, err) => Sentry.captureException(err) });
```

---

## White-Label Theming

Build your own branded DEX with zero code changes:

```javascript
import { applyTheme } from '@xrpl-dex/themes';

applyTheme(document.getElementById('dex-root'), {
  name: 'My Exchange',
  colors: {
    primary: '#ff6b00',
    positive: '#00ff88',
    negative: '#ff0044',
    warning: '#ffaa00',
    background: '#111111',
    surface: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#888888',
    border: '#333333',
    chart: { up: '#00ff88', down: '#ff0044', volume: 'rgba(255,107,0,0.3)' },
  },
});
```

CSS custom properties applied: `--dex-color-primary`, `--dex-color-positive`, `--dex-color-warning`, etc. All components use these variables — one config object reskins everything.

---

## B2B / Institutional

The widget is built for B2B institutional deployment:

- **Compliance hook** — `onBeforeSwap` callback for KYC/AML checks before execution. Set `requireCompliance={true}` to block swaps without compliance.
- **Configurable logger** — silent by default, inject your own error reporting (Sentry, Datadog, etc.)
- **Input validation** — all amounts and addresses validated before transaction building
- **Error boundary** — widget catches rendering errors and shows recovery UI
- **Audit logging** — trade history with CSV export for compliance
- **Trust line safety** — waits for trust line confirmation before proceeding to swap
- **Data freshness** — shows staleness warning when order book data is old
- **Accessibility** — WCAG 2.1 AA with aria labels, roles, keyboard navigation
- **Auto-routing** — XRPL natively routes through both DEX order book and AMM pools for best execution price

---

## Roadmap

- [x] Core SDK (order book, swap, tokens, estimation, validation)
- [x] React hooks (useOrderBook, useOrderBookWs, useSwap, usePriceAlerts, useKeyboardShortcuts, useFavouritePairs)
- [x] 4 wallet adapters (Xaman, Crossmark, GemWallet, SoundBip)
- [x] Theme system with 4 presets + white-label + warning colour
- [x] `<XrplDex />` embeddable widget component
- [x] Order book (side-by-side columns, price grouping, depth bars, order count, mini depth chart)
- [x] Price chart (candlestick + volume, independent range/candle selectors, 7 indicators, sub-panes, 7 drawing tools, screenshot, fullscreen, localStorage persistence)
- [x] WebSocket live order book (XRPL `subscribe`, debounced refresh)
- [x] WebSocket live trades (XRPL `subscribe`, LIVE badge, polling fallback)
- [x] Token verification badges (verified issuer allowlist)
- [x] Recent trades (AMM badges, counter currency badges, volume summary, live timestamp)
- [x] Limit order management UI (open orders, cancel via OfferCancel)
- [x] Trade history (user's own trades, pagination, CSV export)
- [x] Swap panel (market + limit, quick amounts, slippage, trust line detection + confirmation, transaction preview, auto-routing)
- [x] Price alerts (browser notifications, localStorage persistence, bell icon)
- [x] 24h price change percentage in pair header
- [x] Quick token search in pair header
- [x] Keyboard shortcuts with discoverable legend
- [x] Favourite pairs (localStorage-persisted)
- [x] Error boundary with retry
- [x] Configurable logger (setLogger)
- [x] Input validation + address validation
- [x] Mandatory compliance mode
- [x] Redis OHLC backend (continuous 5m collection, resolution-tagged storage, aggregation)
- [ ] npm publish

---

## Contributing

This is an open source project by [Lazy Jack Ltd](https://github.com/Lazy-Jack-Ltd). Contributions welcome.

```bash
git clone https://github.com/Lazy-Jack-Ltd/xrpl-dex.git
cd xrpl-dex
npm install
npm run dev
```

---

## License

MIT — use it for anything. Build your own DEX. We'd love to see what you create.

---

## Related

- [XRPL Documentation](https://xrpl.org/) — Official XRP Ledger docs
- [book_offers API](https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/path-and-order-book-methods/book_offers) — Native XRPL order book
- [OfferCreate](https://xrpl.org/docs/references/protocol/transactions/types/offercreate) — XRPL swap transaction type
- [XRPL AMM](https://xrpl.org/docs/concepts/tokens/decentralized-exchange/automated-market-makers) — Automated Market Maker integration

**Built by [Lazy Jack Ltd](https://github.com/Lazy-Jack-Ltd)** — finding and plugging leakage from island economies and beyond.
