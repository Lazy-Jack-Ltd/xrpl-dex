/**
 * XRPL Token definitions and well-known issuers.
 *
 * The XRPL represents tokens as { currency, issuer } pairs.
 * XRP is special — no issuer, amounts in "drops" (1 XRP = 1,000,000 drops).
 */

export interface XrplToken {
  currency: string;
  issuer?: string; // undefined for XRP
  name: string;
  decimals: number;
}

export interface TradingPair {
  base: XrplToken;
  quote: XrplToken;
}

// ─── Well-known tokens ──────────────────────────────────────

export const XRP: XrplToken = {
  currency: 'XRP',
  name: 'XRP',
  decimals: 6,
};

export const RLUSD: XrplToken = {
  currency: 'RLUSD',
  issuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De', // Ripple
  name: 'RLUSD',
  decimals: 6,
};

export const USDC: XrplToken = {
  currency: 'USD',
  issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B', // Bitstamp
  name: 'USDC (Bitstamp)',
  decimals: 6,
};

export const USDT: XrplToken = {
  currency: 'USD',
  issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq', // GateHub
  name: 'USDT (GateHub)',
  decimals: 6,
};

// ─── Token registry ─────────────────────────────────────────

const REGISTRY: XrplToken[] = [XRP, RLUSD, USDC, USDT];

/** Look up a token by currency code + issuer. */
export function findToken(currency: string, issuer?: string): XrplToken | undefined {
  if (currency === 'XRP' && !issuer) return XRP;
  return REGISTRY.find(
    (t) => t.currency === currency && t.issuer === issuer
  );
}

/** Get all registered tokens. */
export function getAllTokens(): XrplToken[] {
  return [...REGISTRY];
}

/** Register a custom token at runtime. */
export function registerToken(token: XrplToken): void {
  const existing = findToken(token.currency, token.issuer);
  if (!existing) {
    REGISTRY.push(token);
  }
}

// ─── Default trading pairs ──────────────────────────────────

export const DEFAULT_PAIRS: TradingPair[] = [
  { base: XRP, quote: RLUSD },
  { base: XRP, quote: USDC },
  { base: RLUSD, quote: USDC },
];

// ─── XRPL amount helpers ────────────────────────────────────

/** Convert human-readable XRP amount to drops string. */
export function xrpToDrops(xrp: number | string): string {
  return String(Math.round(Number(xrp) * 1_000_000));
}

/** Convert drops string to human-readable XRP number. */
export function dropsToXrp(drops: string | number): number {
  return Number(drops) / 1_000_000;
}

/**
 * Build an XRPL Amount object for use in transactions.
 * XRP → string of drops. Tokens → { currency, issuer, value }.
 */
export function toXrplAmount(token: XrplToken, value: number | string): string | { currency: string; issuer: string; value: string } {
  if (!token.issuer) {
    // XRP: amount in drops
    return xrpToDrops(value);
  }
  return {
    currency: token.currency,
    issuer: token.issuer,
    value: String(value),
  };
}
