/**
 * XRPL Order Book — fetch and parse book_offers.
 *
 * The XRPL DEX order book is queried via the `book_offers` RPC command.
 * Each offer has TakerGets (what the taker receives) and TakerPays (what the taker pays).
 */

import type { Client, BookOffer } from 'xrpl';
import type { XrplToken } from './tokens.js';
import { toXrplAmount, dropsToXrp } from './tokens.js';
import { getClient } from './connection.js';

export interface OrderBookEntry {
  /** Price per unit of base token, denominated in quote token */
  price: number;
  /** Amount of base token available at this price */
  size: number;
  /** Total value in quote token (price * size) */
  total: number;
  /** Cumulative size from best price */
  cumulative: number;
  /** The raw XRPL offer */
  raw: BookOffer;
}

export interface OrderBook {
  /** Sorted best-to-worst: lowest price first (people selling base for quote) */
  asks: OrderBookEntry[];
  /** Sorted best-to-worst: highest price first (people buying base for quote) */
  bids: OrderBookEntry[];
  /** Mid-market price (average of best bid and best ask) */
  midPrice: number | null;
  /** Spread as a percentage */
  spreadPct: number | null;
  /** Timestamp */
  fetchedAt: number;
}

/** Extract numeric value from an XRPL Amount (drops string or {value} object). */
function amountToNumber(amount: string | { value: string; currency: string; issuer: string }): number {
  if (typeof amount === 'string') {
    return dropsToXrp(amount);
  }
  return Number(amount.value);
}

/** Build the currency object for book_offers request. */
function toCurrencyRef(token: XrplToken): { currency: string; issuer?: string } {
  if (!token.issuer) return { currency: 'XRP' };
  return { currency: token.currency, issuer: token.issuer };
}

/**
 * Fetch the order book for a trading pair.
 *
 * @param base  The base token (e.g. XRP)
 * @param quote The quote token (e.g. RLUSD)
 * @param limit Max offers per side (default 50)
 */
export async function fetchOrderBook(
  base: XrplToken,
  quote: XrplToken,
  limit = 50,
  client?: Client,
): Promise<OrderBook> {
  const c = client || await getClient();

  // Asks: people selling base for quote
  // In XRPL terms: TakerGets = base, TakerPays = quote
  const asksResponse = await c.request({
    command: 'book_offers',
    taker_gets: toCurrencyRef(base) as any,
    taker_pays: toCurrencyRef(quote) as any,
    limit,
  });

  // Bids: people buying base for quote
  // In XRPL terms: TakerGets = quote, TakerPays = base
  const bidsResponse = await c.request({
    command: 'book_offers',
    taker_gets: toCurrencyRef(quote) as any,
    taker_pays: toCurrencyRef(base) as any,
    limit,
  });

  const asks = parseAsks(asksResponse.result.offers || []);
  const bids = parseBids(bidsResponse.result.offers || []);

  const bestAsk = asks[0]?.price ?? null;
  const bestBid = bids[0]?.price ?? null;
  const midPrice = bestAsk !== null && bestBid !== null ? (bestAsk + bestBid) / 2 : null;
  const spreadPct = bestAsk !== null && bestBid !== null && midPrice
    ? ((bestAsk - bestBid) / midPrice) * 100
    : null;

  return {
    asks,
    bids,
    midPrice,
    spreadPct,
    fetchedAt: Date.now(),
  };
}

/** Parse ask offers (selling base). Sorted lowest price first. */
function parseAsks(offers: BookOffer[]): OrderBookEntry[] {
  let cumulative = 0;

  return offers
    .map((offer) => {
      const baseAmount = amountToNumber(offer.TakerGets as any);
      const quoteAmount = amountToNumber(offer.TakerPays as any);
      if (baseAmount === 0) return null;

      const price = quoteAmount / baseAmount;
      cumulative += baseAmount;

      return {
        price,
        size: baseAmount,
        total: quoteAmount,
        cumulative,
        raw: offer,
      };
    })
    .filter(Boolean) as OrderBookEntry[];
}

/** Parse bid offers (buying base). Sorted highest price first. */
function parseBids(offers: BookOffer[]): OrderBookEntry[] {
  let cumulative = 0;

  return offers
    .map((offer) => {
      // Bids are inverted: TakerGets = quote, TakerPays = base
      const quoteAmount = amountToNumber(offer.TakerGets as any);
      const baseAmount = amountToNumber(offer.TakerPays as any);
      if (baseAmount === 0) return null;

      const price = quoteAmount / baseAmount;
      cumulative += baseAmount;

      return {
        price,
        size: baseAmount,
        total: quoteAmount,
        cumulative,
        raw: offer,
      };
    })
    .filter(Boolean) as OrderBookEntry[];
}

/**
 * Estimate the output amount for a swap given the current order book.
 *
 * @param book      Current order book
 * @param side      'buy' (buying base) or 'sell' (selling base)
 * @param amount    Amount of input token
 * @returns Estimated output, price impact %, and effective price
 */
export function estimateSwap(
  book: OrderBook,
  side: 'buy' | 'sell',
  amount: number,
): { output: number; effectivePrice: number; priceImpact: number; filled: boolean } {
  const offers = side === 'sell' ? book.bids : book.asks;
  let remaining = amount;
  let totalOutput = 0;

  for (const entry of offers) {
    if (remaining <= 0) break;

    const fillSize = Math.min(remaining, entry.size);
    const fillOutput = side === 'sell'
      ? fillSize * entry.price    // Selling base → receive quote
      : fillSize;                  // Buying base → receive base (pay quote)

    if (side === 'buy') {
      // When buying, we're spending quote to get base
      const cost = fillSize * entry.price;
      if (cost > remaining) {
        // Partial fill
        const partialBase = remaining / entry.price;
        totalOutput += partialBase;
        remaining = 0;
      } else {
        totalOutput += fillSize;
        remaining -= cost;
      }
    } else {
      totalOutput += fillOutput;
      remaining -= fillSize;
    }
  }

  const filled = remaining <= 0;
  const effectivePrice = amount > 0 && totalOutput > 0
    ? (side === 'sell' ? totalOutput / amount : amount / totalOutput)
    : 0;

  const midPrice = book.midPrice || effectivePrice;
  const priceImpact = midPrice > 0
    ? Math.abs((effectivePrice - midPrice) / midPrice) * 100
    : 0;

  return { output: totalOutput, effectivePrice, priceImpact, filled };
}
