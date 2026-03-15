/**
 * React hook for building and executing XRPL swaps.
 *
 * Provides live swap estimation and transaction building.
 * Wallet signing is left to the consumer (Xaman, GemWallet, Web3Auth, etc.)
 */

import { useState, useMemo, useCallback } from 'react';
import type { XrplToken } from '../core/tokens.js';
import type { OrderBook } from '../core/orderbook.js';
import { estimateSwap } from '../core/orderbook.js';
import { buildSwapForWallet, type SwapParams } from '../core/swap.js';

export interface UseSwapOptions {
  /** Default slippage tolerance. Default 0.01 (1%). */
  defaultSlippage?: number;
}

export interface SwapEstimate {
  /** Estimated output amount */
  output: number;
  /** Effective price (quote per base) */
  effectivePrice: number;
  /** Price impact as percentage */
  priceImpact: number;
  /** Whether the order book has enough liquidity */
  filled: boolean;
}

export interface UseSwapResult {
  /** Current swap estimate based on input amount */
  estimate: SwapEstimate | null;
  /** The sell (input) amount */
  sellAmount: string;
  /** Set the sell amount */
  setSellAmount: (amount: string) => void;
  /** Current slippage setting */
  slippage: number;
  /** Set slippage tolerance (0-1) */
  setSlippage: (s: number) => void;
  /** Build the transaction object for wallet signing */
  buildTransaction: (account: string) => Record<string, unknown> | null;
  /** Whether there's a valid estimate */
  canSwap: boolean;
  /** Flip the trading direction */
  flipPair: () => void;
  /** Current sell token */
  sellToken: XrplToken | null;
  /** Current buy token */
  buyToken: XrplToken | null;
  /** Set the sell token */
  setSellToken: (t: XrplToken) => void;
  /** Set the buy token */
  setBuyToken: (t: XrplToken) => void;
}

export function useSwap(
  initialSellToken: XrplToken | null,
  initialBuyToken: XrplToken | null,
  orderBook: OrderBook | null,
  options?: UseSwapOptions,
): UseSwapResult {
  const { defaultSlippage = 0.01 } = options || {};

  const [sellToken, setSellToken] = useState(initialSellToken);
  const [buyToken, setBuyToken] = useState(initialBuyToken);
  const [sellAmount, setSellAmount] = useState('');
  const [slippage, setSlippage] = useState(defaultSlippage);

  // Estimate swap output
  const estimate = useMemo<SwapEstimate | null>(() => {
    const amount = parseFloat(sellAmount);
    if (!orderBook || !amount || amount <= 0) return null;

    return estimateSwap(orderBook, 'sell', amount);
  }, [orderBook, sellAmount]);

  const canSwap = !!(estimate && estimate.filled && estimate.output > 0);

  // Build transaction for wallet signing
  const buildTransaction = useCallback(
    (account: string): Record<string, unknown> | null => {
      if (!canSwap || !sellToken || !buyToken || !estimate) return null;

      const params: SwapParams = {
        sellToken,
        buyToken,
        sellAmount: parseFloat(sellAmount),
        minBuyAmount: estimate.output,
        account,
        slippage,
      };

      return buildSwapForWallet(params);
    },
    [canSwap, sellToken, buyToken, estimate, sellAmount, slippage],
  );

  // Flip direction
  const flipPair = useCallback(() => {
    setSellToken(buyToken);
    setBuyToken(sellToken);
    setSellAmount('');
  }, [sellToken, buyToken]);

  return {
    estimate,
    sellAmount,
    setSellAmount,
    slippage,
    setSlippage,
    buildTransaction,
    canSwap,
    flipPair,
    sellToken,
    buyToken,
    setSellToken,
    setBuyToken,
  };
}
