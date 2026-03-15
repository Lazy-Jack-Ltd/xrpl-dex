/**
 * XRPL Swap — build and submit OfferCreate transactions.
 *
 * On the XRPL, a "swap" is an OfferCreate transaction with tfImmediateOrCancel
 * flag set (fill-or-kill). This ensures the trade executes immediately at the
 * current market price or fails — no lingering limit orders.
 */

import type { Client, OfferCreate, TxResponse } from 'xrpl';
import type { XrplToken } from './tokens.js';
import { toXrplAmount } from './tokens.js';
import { getClient } from './connection.js';

/** Flags for OfferCreate */
const tfImmediateOrCancel = 0x00020000;
const tfSell = 0x00080000;

export interface SwapParams {
  /** The token you're selling (giving away) */
  sellToken: XrplToken;
  /** The token you're buying (receiving) */
  buyToken: XrplToken;
  /** Amount of sellToken to sell */
  sellAmount: number | string;
  /** Minimum amount of buyToken to receive (slippage protection) */
  minBuyAmount: number | string;
  /** Your XRPL address */
  account: string;
  /** Slippage tolerance as decimal (0.01 = 1%). Applied on top of minBuyAmount. */
  slippage?: number;
}

export interface SwapTransaction {
  /** The unsigned XRPL transaction, ready for wallet signing */
  tx: OfferCreate;
  /** Human-readable summary */
  summary: {
    selling: string;
    buying: string;
    minReceiving: string;
  };
}

/**
 * Build an OfferCreate transaction for an immediate swap.
 *
 * Returns the unsigned transaction — the caller is responsible for
 * signing it (via Xaman, GemWallet, Web3Auth, etc.).
 */
export function buildSwapTx(params: SwapParams): SwapTransaction {
  const { sellToken, buyToken, sellAmount, minBuyAmount, account, slippage = 0 } = params;

  // Apply slippage: reduce minBuyAmount
  const adjustedMinBuy = Number(minBuyAmount) * (1 - slippage);

  // OfferCreate: TakerPays = what I want (buyToken), TakerGets = what I give (sellToken)
  const tx: OfferCreate = {
    TransactionType: 'OfferCreate',
    Account: account,
    TakerPays: toXrplAmount(buyToken, adjustedMinBuy) as any,
    TakerGets: toXrplAmount(sellToken, sellAmount) as any,
    Flags: tfImmediateOrCancel | tfSell,
  };

  return {
    tx,
    summary: {
      selling: `${sellAmount} ${sellToken.name}`,
      buying: `${minBuyAmount} ${buyToken.name}`,
      minReceiving: `${adjustedMinBuy.toFixed(6)} ${buyToken.name} (after ${(slippage * 100).toFixed(1)}% slippage)`,
    },
  };
}

/**
 * Submit a signed transaction to the XRPL.
 *
 * Most apps won't use this directly — wallet SDKs (Xaman, GemWallet, Web3Auth)
 * handle signing and submission. This is for server-side or programmatic use.
 */
export async function submitSignedTx(
  txBlob: string,
  client?: Client,
): Promise<TxResponse> {
  const c = client || await getClient();
  const result = await c.submit(txBlob);
  return result as unknown as TxResponse;
}

/**
 * Build a swap transaction for common wallet SDKs.
 *
 * Returns a plain object that can be passed directly to:
 * - Xaman: sdk.payload.create({ txjson: result })
 * - GemWallet: signTransaction(result)
 * - Web3Auth: provider.request({ method: 'xrpl_submitTransaction', params: { transaction: result } })
 */
export function buildSwapForWallet(params: SwapParams): Record<string, unknown> {
  const { tx } = buildSwapTx(params);

  // Return a clean plain object (no class instances)
  return {
    TransactionType: tx.TransactionType,
    Account: tx.Account,
    TakerPays: tx.TakerPays,
    TakerGets: tx.TakerGets,
    Flags: tx.Flags,
  };
}
