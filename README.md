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

## Status: Active Development

> This project is under active development by [Lazy Jack Ltd](https://github.com/Lazy-Jack-Ltd). Core SDK is functional. UI widget coming soon.

| Component | Status | Description |
|-----------|--------|-------------|
| `@xrpl-dex/core` | **Available** | Order book, swap estimation, transaction building, token registry |
| `@xrpl-dex/react` | **Available** | React hooks (`useOrderBook`, `useSwap`) |
| `@xrpl-dex/wallets` | **Available** | Wallet adapters (Xaman, Crossmark, GemWallet, SoundBip) |
| `@xrpl-dex/widget` | **Available** | Embeddable React swap + order book component with theming |
| `@xrpl-dex/themes` | **Available** | 4 pre-built themes (dark, light, midnight, emerald) + white-label |

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

### React Hooks

```jsx
import { useOrderBook, useSwap } from '@xrpl-dex/react';
import { XRP, RLUSD } from '@xrpl-dex/core';

function SwapPanel() {
  const { orderBook, loading } = useOrderBook(XRP, RLUSD, { refreshInterval: 5000 });
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
  }, 3000);
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

#### Order Book

| Export | Type | Description |
|--------|------|-------------|
| `fetchOrderBook(sell, buy, options?)` | async → OrderBook | Fetch live order book from XRPL |
| `estimateSwap(book, amount, options?)` | SwapEstimate \| null | Calculate expected output from order book |

#### Transactions

| Export | Type | Description |
|--------|------|-------------|
| `buildSwapTx(account, sell, buy, amount, minOutput)` | OfferCreate | Market swap (fill-or-kill) |
| `buildLimitOrderTx(account, sell, buy, amount, price)` | OfferCreate | Limit order (stays on book) |
| `buildTrustSetTx(account, token)` | TrustSet \| null | Enable a token (null for XRP) |
| `needsTrustLine(walletStatus, token)` | boolean | Check if trust line needed |
| `checkLedgerResult(engineResult)` | void \| throws | Validate XRPL transaction result |

#### Wallet

| Export | Type | Description |
|--------|------|-------------|
| `getWalletStatus(address, options?)` | async → WalletStatus | Balances + trust lines (via API) |
| `getWalletBalanceDirect(address, endpoint?)` | async → Balances | Direct XRPL query (no backend) |

### React Hooks (`@xrpl-dex/react`)

| Hook | Returns | Description |
|------|---------|-------------|
| `useOrderBook(sell, buy, options?)` | `{ orderBook, loading, error, refresh, estimate }` | Live order book with auto-polling |
| `useSwap(sell, buy, book, options?)` | `{ estimate, sellAmount, setSellAmount, canSwap, buildTransaction, flipPair, ... }` | Swap state management |

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
├── No backend — works entirely client-side
├── Framework-agnostic — vanilla JS, React, Vue, Node.js
└── Zero dependencies (only peer: xrpl.js optional)

XRPL DEX (native to the ledger)
├── Central limit order book — on-chain
├── Matching engine — on-chain
├── Settlement — 3-5 seconds
├── Transaction cost — ~$0.00001
└── No MEV, no front-running, no smart contract risk
```

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

**Dynamic:** Fetches top 200 tokens from [XRPScan API](https://xrpscan.com) with 30-minute cache.

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
    background: '#111111',
    surface: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#888888',
    border: '#333333',
    chart: { up: '#00ff88', down: '#ff0044', volume: 'rgba(255,107,0,0.3)' },
  },
});
```

CSS custom properties applied: `--dex-color-primary`, `--dex-color-positive`, etc. All components use these variables — one config object reskins everything.

---

## Roadmap

- [x] Core SDK (order book, swap, tokens, estimation)
- [x] React hooks (useOrderBook, useSwap, useOrderBookWs, useKeyboardShortcuts, useFavouritePairs)
- [x] 4 wallet adapters (Xaman, Crossmark, GemWallet, SoundBip)
- [x] Theme system with 4 presets + white-label
- [x] `<XrplDex />` embeddable widget component
- [x] Order book depth visualisation (cumulative depth bars, stacked layout, click-to-fill)
- [x] Price charts (lightweight-charts candlestick + volume, 6 timeframes)
- [x] WebSocket live order book (XRPL `subscribe`)
- [x] Token verification badges (verified issuer allowlist)
- [x] Recent trades stream (flash animation, relative size bars, 10s polling)
- [x] Limit order management UI (open orders, cancel via OfferCancel)
- [x] Swap panel (quick amount buttons, slippage, trust line detection, transaction preview)
- [x] Keyboard shortcuts (F flip, Enter swap, M max, Esc clear)
- [x] Favourite pairs (localStorage-persisted)
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

**Built by [Lazy Jack Ltd](https://github.com/Lazy-Jack-Ltd)** — finding and plugging leakage from island economies and beyond.
