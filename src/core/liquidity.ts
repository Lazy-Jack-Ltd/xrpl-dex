/**
 * Liquidity analysis for XRPL trading pairs.
 *
 * Provides depth analysis, volume estimation, and liquidity scoring
 * for any token pair on the XRPL DEX.
 */

import type { OrderBook } from './orderbook.js';

export interface LiquidityInfo {
  /** Total base token available on asks (sell side) */
  askDepth: number;
  /** Total base token available on bids (buy side) */
  bidDepth: number;
  /** Total liquidity in quote token terms */
  totalLiquidityQuote: number;
  /** Number of unique price levels */
  askLevels: number;
  bidLevels: number;
  /** Spread between best bid and best ask */
  spread: number | null;
  spreadPct: number | null;
  /** Depth at various percentages from mid price */
  depthAt1Pct: { bids: number; asks: number };
  depthAt5Pct: { bids: number; asks: number };
  /** Simple liquidity score 0-100 */
  score: number;
}

/**
 * Analyze liquidity for an order book.
 */
export function analyzeLiquidity(book: OrderBook): LiquidityInfo {
  const askDepth = book.asks.reduce((sum, e) => sum + e.size, 0);
  const bidDepth = book.bids.reduce((sum, e) => sum + e.size, 0);

  const askTotalQuote = book.asks.reduce((sum, e) => sum + e.total, 0);
  const bidTotalQuote = book.bids.reduce((sum, e) => sum + e.total, 0);
  const totalLiquidityQuote = askTotalQuote + bidTotalQuote;

  const bestAsk = book.asks[0]?.price ?? null;
  const bestBid = book.bids[0]?.price ?? null;
  const spread = bestAsk !== null && bestBid !== null ? bestAsk - bestBid : null;
  const midPrice = book.midPrice;

  // Depth within X% of mid price
  const depthAt1Pct = depthWithinPct(book, 1);
  const depthAt5Pct = depthWithinPct(book, 5);

  // Simple scoring: combines spread tightness, depth, and level count
  const score = calculateScore(book, spread, midPrice, totalLiquidityQuote);

  return {
    askDepth,
    bidDepth,
    totalLiquidityQuote,
    askLevels: book.asks.length,
    bidLevels: book.bids.length,
    spread,
    spreadPct: book.spreadPct,
    depthAt1Pct,
    depthAt5Pct,
    score,
  };
}

/** Calculate depth (in base token) within X% of mid price. */
function depthWithinPct(
  book: OrderBook,
  pct: number,
): { bids: number; asks: number } {
  const mid = book.midPrice;
  if (!mid) return { bids: 0, asks: 0 };

  const threshold = mid * (pct / 100);

  const bids = book.bids
    .filter((e) => mid - e.price <= threshold)
    .reduce((sum, e) => sum + e.size, 0);

  const asks = book.asks
    .filter((e) => e.price - mid <= threshold)
    .reduce((sum, e) => sum + e.size, 0);

  return { bids, asks };
}

/** Simple 0-100 liquidity score. */
function calculateScore(
  book: OrderBook,
  spread: number | null,
  midPrice: number | null,
  totalLiquidity: number,
): number {
  let score = 0;

  // Spread score (0-40 points): tighter spread = higher score
  if (spread !== null && midPrice && midPrice > 0) {
    const spreadPct = (spread / midPrice) * 100;
    if (spreadPct < 0.1) score += 40;
    else if (spreadPct < 0.5) score += 30;
    else if (spreadPct < 1) score += 20;
    else if (spreadPct < 3) score += 10;
  }

  // Depth score (0-30 points): more liquidity = higher score
  if (totalLiquidity > 100_000) score += 30;
  else if (totalLiquidity > 10_000) score += 20;
  else if (totalLiquidity > 1_000) score += 10;
  else if (totalLiquidity > 100) score += 5;

  // Level count score (0-30 points): more levels = more market makers
  const totalLevels = book.asks.length + book.bids.length;
  if (totalLevels > 50) score += 30;
  else if (totalLevels > 20) score += 20;
  else if (totalLevels > 10) score += 10;
  else if (totalLevels > 4) score += 5;

  return Math.min(100, score);
}
