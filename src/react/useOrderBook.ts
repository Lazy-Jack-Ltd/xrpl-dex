/**
 * React hook for live XRPL order book data.
 *
 * Fetches the order book on mount and refreshes at a configurable interval.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { XrplToken } from '../core/tokens.js';
import type { OrderBook } from '../core/orderbook.js';
import { fetchOrderBook } from '../core/orderbook.js';
import { analyzeLiquidity, type LiquidityInfo } from '../core/liquidity.js';

export interface UseOrderBookOptions {
  /** Refresh interval in ms. Default 5000 (5s). Set 0 to disable. */
  refreshInterval?: number;
  /** Max offers per side. Default 50. */
  limit?: number;
  /** Start paused. Default false. */
  paused?: boolean;
}

export interface UseOrderBookResult {
  /** Current order book data */
  orderBook: OrderBook | null;
  /** Liquidity analysis */
  liquidity: LiquidityInfo | null;
  /** Loading state */
  loading: boolean;
  /** Error if last fetch failed */
  error: Error | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
}

export function useOrderBook(
  base: XrplToken | null,
  quote: XrplToken | null,
  options?: UseOrderBookOptions,
): UseOrderBookResult {
  const { refreshInterval = 5000, limit = 50, paused = false } = options || {};

  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [liquidity, setLiquidity] = useState<LiquidityInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!base || !quote || paused) return;

    setLoading(true);
    setError(null);

    try {
      const book = await fetchOrderBook(base, quote, limit);
      if (!mountedRef.current) return;

      setOrderBook(book);
      setLiquidity(analyzeLiquidity(book));
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [base, quote, limit, paused]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  // Polling
  useEffect(() => {
    if (!refreshInterval || paused || !base || !quote) return;
    const id = setInterval(refresh, refreshInterval);
    return () => clearInterval(id);
  }, [refresh, refreshInterval, paused, base, quote]);

  return { orderBook, liquidity, loading, error, refresh };
}
