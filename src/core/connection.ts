/**
 * XRPL WebSocket connection manager.
 *
 * Maintains a single shared connection to an XRPL node.
 * Supports auto-reconnect and multiple public endpoints.
 */

import { Client } from 'xrpl';

export interface ConnectionConfig {
  /** WebSocket URL. Defaults to xrplcluster.com */
  url?: string;
  /** Timeout in ms for connecting. Default 10000 */
  timeout?: number;
}

const DEFAULT_URLS = [
  'wss://xrplcluster.com',
  'wss://s1.ripple.com',
  'wss://s2.ripple.com',
];

let sharedClient: Client | null = null;
let connectPromise: Promise<Client> | null = null;

/**
 * Get a connected XRPL client (singleton).
 * Safe to call multiple times — returns the same connection.
 */
export async function getClient(config?: ConnectionConfig): Promise<Client> {
  if (sharedClient?.isConnected()) return sharedClient;

  // Avoid concurrent connection attempts
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const url = config?.url || DEFAULT_URLS[0];
    const timeout = config?.timeout || 10_000;

    // Disconnect stale client
    if (sharedClient) {
      try { await sharedClient.disconnect(); } catch (_) {}
      sharedClient = null;
    }

    const client = new Client(url, {
      timeout,
      connectionTimeout: timeout,
    });

    await client.connect();
    sharedClient = client;

    // Auto-reconnect on disconnect
    client.on('disconnected', () => {
      sharedClient = null;
      connectPromise = null;
    });

    return client;
  })();

  try {
    return await connectPromise;
  } finally {
    connectPromise = null;
  }
}

/** Disconnect and clean up. */
export async function disconnect(): Promise<void> {
  if (sharedClient) {
    try { await sharedClient.disconnect(); } catch (_) {}
    sharedClient = null;
  }
  connectPromise = null;
}

/** Check if currently connected. */
export function isConnected(): boolean {
  return sharedClient?.isConnected() ?? false;
}
