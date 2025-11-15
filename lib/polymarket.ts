/**
 * Polymarket Integration Module
 *
 * Provides functions to interact with Polymarket's CLOB (Central Limit Order Book)
 * for fetching markets and placing bets programmatically.
 *
 * Official SDK: @polymarket/clob-client
 * Documentation: https://docs.polymarket.com
 *
 * IMPORTANT PREREQUISITES:
 * 1. Create a Polygon wallet and fund it with USDC
 * 2. Make at least ONE manual trade on Polymarket UI first
 * 3. Export your private key (NEVER commit this!)
 * 4. Set POLYGON_WALLET_PRIVATE_KEY in .env.local
 * 5. Set POLYMARKET_FUNDER_ADDRESS (your profile address) in .env.local
 *
 * Installation:
 *   npm install @polymarket/clob-client ethers@5
 */

import { ClobClient, Side, OrderType, OrderArgs, OrderBookSummary } from '@polymarket/clob-client';
import { Wallet } from '@ethersproject/wallet';

// Polymarket configuration
const CLOB_HOST = 'https://clob.polymarket.com';
const GAMMA_API_HOST = 'https://gamma-api.polymarket.com';
const POLYGON_CHAIN_ID = 137; // Polygon Mainnet
const SIGNATURE_TYPE = 0; // 0 = Browser wallet (MetaMask, etc), 1 = Magic/email login

// Environment variables
const POLYGON_PRIVATE_KEY = process.env.POLYGON_WALLET_PRIVATE_KEY;
const FUNDER_ADDRESS = process.env.POLYMARKET_FUNDER_ADDRESS;

/**
 * Market data from Gamma API
 */
export type PolymarketMarket = {
  id: string;
  question: string;
  description?: string;
  end_date_iso: string;
  tokens: Array<{
    outcome: string;
    token_id: string;
    price: string;
    winner?: boolean;
  }>;
  tick_size: string;
  neg_risk: boolean;
  liquidity?: string;
  volume?: string;
  category?: string;
};

/**
 * Simplified market info for our database
 */
export type SimplifiedMarket = {
  polymarket_id: string;
  question: string;
  description: string | null;
  category: string | null;
  close_date: string;
  current_price: number; // YES token price
  volume: number | null;
  yes_token_id: string;
  no_token_id: string;
  tick_size: string;
  neg_risk: boolean;
};

/**
 * Order result from Polymarket
 */
export type PolymarketOrderResult = {
  success: boolean;
  orderID?: string;
  error?: string;
  transactionHash?: string;
};

/**
 * Initialize Polymarket CLOB client
 *
 * Creates authenticated client for placing orders.
 * Generates API credentials deterministically from wallet signature.
 *
 * @returns ClobClient instance
 * @throws Error if credentials are missing
 */
export async function initializePolymarketClient(): Promise<ClobClient> {
  if (!POLYGON_PRIVATE_KEY) {
    throw new Error('POLYGON_WALLET_PRIVATE_KEY environment variable is required');
  }

  if (!FUNDER_ADDRESS) {
    throw new Error('POLYMARKET_FUNDER_ADDRESS environment variable is required');
  }

  // Create wallet signer
  const signer = new Wallet(POLYGON_PRIVATE_KEY);

  // Create or derive API credentials (deterministic based on signature)
  const tempClient = new ClobClient(CLOB_HOST, POLYGON_CHAIN_ID, signer);
  const credentials = await tempClient.createOrDeriveApiKey();

  // Initialize authenticated client
  const client = new ClobClient(
    CLOB_HOST,
    POLYGON_CHAIN_ID,
    signer,
    credentials,
    SIGNATURE_TYPE,
    FUNDER_ADDRESS
  );

  console.log('✅ Polymarket client initialized');
  return client;
}

/**
 * Fetch all active markets from Polymarket Gamma API
 *
 * Uses pagination to fetch all available markets.
 * Filters for active markets that haven't closed yet.
 *
 * @param limit - Maximum number of markets to fetch (default: 100)
 * @returns Array of active markets
 */
export async function fetchPolymarketMarkets(limit: number = 100): Promise<SimplifiedMarket[]> {
  const url = `${GAMMA_API_HOST}/markets`;
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    archived: 'false',
    limit: limit.toString(),
    offset: '0'
  });

  try {
    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
    }

    const markets: PolymarketMarket[] = await response.json();

    // Convert to simplified format for our database
    return markets.map(market => ({
      polymarket_id: market.id,
      question: market.question,
      description: market.description || null,
      category: market.category || null,
      close_date: market.end_date_iso,
      current_price: parseFloat(market.tokens.find(t => t.outcome === 'Yes')?.price || '0.5'),
      volume: market.volume ? parseFloat(market.volume) : null,
      yes_token_id: market.tokens.find(t => t.outcome === 'Yes')?.token_id || '',
      no_token_id: market.tokens.find(t => t.outcome === 'No')?.token_id || '',
      tick_size: market.tick_size,
      neg_risk: market.neg_risk
    }));

  } catch (error) {
    console.error('Error fetching Polymarket markets:', error);
    throw error;
  }
}

/**
 * Place a bet on Polymarket
 *
 * Creates and posts an order to the Polymarket CLOB.
 *
 * IMPORTANT NOTES:
 * - Price must be between 0.001 and 0.999
 * - Price must be a multiple of tickSize
 * - Size is in USDC (e.g., 10 = $10)
 * - Must have USDC balance and allowances set
 * - Orders are limit orders (GTC = Good Till Canceled)
 *
 * @param client - Initialized ClobClient
 * @param tokenId - Token ID to buy (YES or NO token)
 * @param side - 'BUY' or 'SELL'
 * @param price - Limit price (0.001 to 0.999)
 * @param size - Order size in USDC
 * @param tickSize - Market tick size (e.g., '0.001')
 * @param negRisk - Market neg_risk parameter
 * @returns Order result with orderID if successful
 */
export async function placePolymarketBet(
  client: ClobClient,
  tokenId: string,
  side: 'BUY' | 'SELL',
  price: number,
  size: number,
  tickSize: string,
  negRisk: boolean
): Promise<PolymarketOrderResult> {
  try {
    // Validate price
    if (price < 0.001 || price > 0.999) {
      throw new Error('Price must be between 0.001 and 0.999');
    }

    // Validate price is multiple of tick size
    const tick = parseFloat(tickSize);
    if (Math.abs((price % tick) - 0) > 0.0000001 && Math.abs((price % tick) - tick) > 0.0000001) {
      throw new Error(`Price must be a multiple of tick size ${tickSize}`);
    }

    // Create order
    const orderArgs: OrderArgs = {
      tokenID: tokenId,
      price: price,
      side: side === 'BUY' ? Side.BUY : Side.SELL,
      size: size
    };

    const response = await client.createAndPostOrder(
      orderArgs,
      {
        tickSize: tickSize,
        negRisk: negRisk
      },
      OrderType.GTC // Good Till Canceled
    );

    console.log('✅ Order placed successfully:', response);

    return {
      success: true,
      orderID: response.orderID,
      transactionHash: response.transactionHash
    };

  } catch (error) {
    console.error('❌ Error placing Polymarket bet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get current orderbook for a token
 *
 * @param client - Initialized ClobClient
 * @param tokenId - Token ID to get orderbook for
 * @returns Orderbook summary with bids and asks
 */
export async function getOrderbook(
  client: ClobClient,
  tokenId: string
): Promise<OrderBookSummary> {
  return await client.getOrderBook(tokenId);
}

/**
 * Cancel an open order
 *
 * @param client - Initialized ClobClient
 * @param orderID - ID of order to cancel
 * @returns Success boolean
 */
export async function cancelOrder(
  client: ClobClient,
  orderID: string
): Promise<boolean> {
  try {
    await client.cancelOrder(orderID);
    console.log('✅ Order canceled:', orderID);
    return true;
  } catch (error) {
    console.error('❌ Error canceling order:', error);
    return false;
  }
}

/**
 * Get all open orders
 *
 * @param client - Initialized ClobClient
 * @returns Array of open orders
 */
export async function getOpenOrders(client: ClobClient): Promise<any[]> {
  return await client.getOpenOrders();
}

/**
 * Check if Polymarket is configured
 *
 * @returns true if all required environment variables are set
 */
export function isPolymarketConfigured(): boolean {
  return !!(POLYGON_PRIVATE_KEY && FUNDER_ADDRESS);
}

/**
 * Example usage function (for testing)
 *
 * Demonstrates the complete flow:
 * 1. Initialize client
 * 2. Fetch markets
 * 3. Place a bet
 *
 * @example
 * ```typescript
 * await testPolymarketIntegration();
 * ```
 */
export async function testPolymarketIntegration() {
  if (!isPolymarketConfigured()) {
    console.error('❌ Polymarket not configured. Set POLYGON_WALLET_PRIVATE_KEY and POLYMARKET_FUNDER_ADDRESS');
    return;
  }

  try {
    // 1. Fetch markets
    console.log('📊 Fetching markets...');
    const markets = await fetchPolymarketMarkets(10);
    console.log(`Found ${markets.length} markets`);
    console.log('Sample market:', markets[0]?.question);

    // 2. Initialize client
    console.log('\n🔐 Initializing client...');
    const client = await initializePolymarketClient();

    // 3. Get orderbook for first market
    if (markets[0]) {
      console.log('\n📖 Fetching orderbook...');
      const orderbook = await getOrderbook(client, markets[0].yes_token_id);
      console.log('Orderbook:', {
        bids: orderbook.bids.length,
        asks: orderbook.asks.length,
        bestBid: orderbook.bids[0],
        bestAsk: orderbook.asks[0]
      });
    }

    // 4. Example: Place a small test bet (commented out for safety)
    /*
    console.log('\n💰 Placing test bet...');
    const result = await placePolymarketBet(
      client,
      markets[0].yes_token_id,
      'BUY',
      0.50, // 50% probability
      1.0,  // $1 bet
      markets[0].tick_size,
      markets[0].neg_risk
    );
    console.log('Bet result:', result);
    */

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}
