/**
 * Polymarket Market Data Integration
 *
 * Fetches real prediction market data from Polymarket's public Gamma API.
 * This allows our AI agents to make paper trading decisions on real markets.
 *
 * NO AUTHENTICATION REQUIRED - Uses public API only
 * NO REAL TRADING - Purely for market data fetching
 *
 * Official API: https://gamma-api.polymarket.com
 * Documentation: https://docs.polymarket.com
 */

// Polymarket API endpoints
const GAMMA_API_HOST = 'https://gamma-api.polymarket.com';

// Configuration constants
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // 2s, 4s, 8s exponential backoff

/**
 * Market data from Polymarket Gamma API
 */
type PolymarketMarket = {
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
  closed: boolean;
  archived: boolean;
  active: boolean;
  category?: string;
  liquidity?: string;
  volume?: string;
  resolving?: boolean;
  resolved?: boolean;
};

/**
 * Simplified market info for our database
 */
type SimplifiedMarket = {
  polymarket_id: string;
  question: string;
  description: string | null;
  category: string | null;
  close_date: string;
  current_price: number; // YES token price (0-1)
  volume: number | null;
  status: 'active' | 'closed' | 'resolved';
};

/**
 * Helper: Fetch with timeout using AbortController
 *
 * Wraps fetch() with a timeout to prevent hanging requests.
 *
 * @param url - URL to fetch
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @returns Response from fetch
 * @throws Error if request times out or fails
 */
async function fetchWithTimeout(url: string, timeout: number = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Helper: Determine if an error is retryable
 *
 * Retryable errors include:
 * - Network errors (AbortError, fetch failures)
 * - 5xx server errors
 * - 429 rate limit errors
 *
 * @param error - Error object from fetch
 * @param response - Response object (if available)
 * @returns true if error should be retried
 */
function isRetryableError(error: any, response?: Response): boolean {
  // Network errors
  if (error) {
    if (error.name === 'AbortError') {
      return true;
    }
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return true;
    }
  }

  // HTTP errors
  if (response) {
    // 5xx server errors
    if (response.status >= 500 && response.status < 600) {
      return true;
    }
    // 429 rate limit
    if (response.status === 429) {
      return true;
    }
  }

  return false;
}

/**
 * Helper: Fetch with retry logic and exponential backoff
 *
 * Automatically retries failed requests with exponential backoff.
 * - Retry up to 3 times on failure
 * - Backoff delays: 2s, 4s, 8s
 * - Retries on network errors, 5xx errors, and 429 rate limits
 *
 * @param url - URL to fetch
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Response from fetch
 * @throws Error if all retries fail
 */
async function fetchWithRetry(url: string, maxRetries: number = MAX_RETRIES): Promise<Response> {
  let lastError: any;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url);

      // Check if we should retry based on status code
      if (!response.ok && isRetryableError(null, response)) {
        lastResponse = response;
        if (attempt < maxRetries) {
          const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          console.log(`⚠️  Retry ${attempt + 1}/${maxRetries} after ${delay}ms for ${response.status} error on ${url}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (error: any) {
      lastError = error;

      if (isRetryableError(error) && attempt < maxRetries) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log(`⚠️  Retry ${attempt + 1}/${maxRetries} after ${delay}ms due to network error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  // If we exhausted retries, throw the last error or response
  if (lastResponse) {
    throw new Error(`Max retries exceeded. Last status: ${lastResponse.status} ${lastResponse.statusText}`);
  }
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Helper: Validate market data structure
 *
 * Ensures the API response contains all required fields and valid data.
 * Checks:
 * - Required fields exist (id, question, end_date_iso)
 * - Tokens array exists and is not empty
 * - Token prices are valid numbers (not NaN)
 *
 * @param market - Market data from API
 * @returns true if valid, false otherwise
 */
function validateMarketData(market: any): boolean {
  // Check required fields exist
  if (!market || typeof market !== 'object') {
    console.warn('Market data is not an object');
    return false;
  }

  if (!market.id || typeof market.id !== 'string') {
    console.warn('Market missing valid id field');
    return false;
  }

  if (!market.question || typeof market.question !== 'string') {
    console.warn(`Market ${market.id} missing valid question field`);
    return false;
  }

  if (!market.end_date_iso || typeof market.end_date_iso !== 'string') {
    console.warn(`Market ${market.id} missing valid end_date_iso field`);
    return false;
  }

  // Check tokens array exists and is not empty
  if (!Array.isArray(market.tokens)) {
    console.warn(`Market ${market.id} has invalid tokens field (not an array)`);
    return false;
  }

  if (market.tokens.length === 0) {
    console.warn(`Market ${market.id} has empty tokens array`);
    return false;
  }

  // Validate token data
  for (const token of market.tokens) {
    if (!token.outcome || typeof token.outcome !== 'string') {
      console.warn(`Market ${market.id} has token with invalid outcome`);
      return false;
    }

    if (!token.token_id || typeof token.token_id !== 'string') {
      console.warn(`Market ${market.id} has token with invalid token_id`);
      return false;
    }

    if (token.price === undefined || token.price === null) {
      console.warn(`Market ${market.id} has token with missing price`);
      return false;
    }

    // Validate price is a valid number
    const price = parseFloat(token.price);
    if (isNaN(price)) {
      console.warn(`Market ${market.id} has token with NaN price: ${token.price}`);
      return false;
    }

    // Additional validation: price should be between 0 and 1
    if (price < 0 || price > 1) {
      console.warn(`Market ${market.id} has token with price out of range [0,1]: ${price}`);
      return false;
    }
  }

  return true;
}

/**
 * Helper: Safely parse market to simplified format
 *
 * Converts Polymarket API format to our simplified database format.
 * Includes validation and error handling.
 *
 * @param market - Market data from Polymarket API
 * @param expectedStatus - Expected status for the market (optional)
 * @returns SimplifiedMarket or null if parsing fails
 */
function parseMarketToSimplified(
  market: PolymarketMarket,
  expectedStatus?: 'active' | 'closed' | 'resolved'
): SimplifiedMarket | null {
  try {
    // Validate before parsing
    if (!validateMarketData(market)) {
      console.warn(`Skipping invalid market data for market ${market.id || 'unknown'}`);
      return null;
    }

    const yesToken = market.tokens.find(t => t.outcome === 'Yes');
    const noToken = market.tokens.find(t => t.outcome === 'No');

    // Default to 0.5 if Yes token not found, but log warning
    let currentPrice = 0.5;
    if (yesToken) {
      currentPrice = parseFloat(yesToken.price);
      if (isNaN(currentPrice)) {
        console.warn(`Invalid price for market ${market.id}, defaulting to 0.5`);
        currentPrice = 0.5;
      }
    } else {
      console.warn(`Market ${market.id} missing Yes token, defaulting price to 0.5`);
    }

    // Determine status
    let status: 'active' | 'closed' | 'resolved' = expectedStatus || 'active';
    if (!expectedStatus) {
      if (market.resolved || yesToken?.winner !== undefined || noToken?.winner !== undefined) {
        status = 'resolved';
      } else if (market.closed || !market.active) {
        status = 'closed';
      }
    }

    // Parse volume safely
    let volume: number | null = null;
    if (market.volume) {
      const parsedVolume = parseFloat(market.volume);
      if (!isNaN(parsedVolume)) {
        volume = parsedVolume;
      }
    }

    return {
      polymarket_id: market.id,
      question: market.question,
      description: market.description || null,
      category: market.category || null,
      close_date: market.end_date_iso,
      current_price: currentPrice,
      volume,
      status
    };
  } catch (error) {
    console.error(`Error parsing market ${market.id}:`, error);
    return null;
  }
}

/**
 * Fetch ALL active markets from Polymarket using pagination
 *
 * This function makes multiple API requests to fetch all available active markets.
 * The Polymarket API has a maximum of 100 markets per request, so we loop through
 * all pages until we've retrieved everything.
 *
 * Features:
 * - Automatic pagination (loops until no more markets)
 * - Rate limiting (500ms delay between requests to be respectful)
 * - Progress logging (so you know it's working on large datasets)
 * - Retry logic with exponential backoff
 * - Data validation
 * - Graceful degradation: returns partial results if later pages fail
 *
 * @returns Array of ALL active markets from Polymarket
 *
 * @example
 * const allMarkets = await fetchAllPolymarketMarkets();
 * console.log(`Found ${allMarkets.length} total active markets`);
 */
export async function fetchAllPolymarketMarkets(): Promise<SimplifiedMarket[]> {
  const allMarkets: SimplifiedMarket[] = [];
  let offset = 0;
  const limit = 100; // Maximum allowed by Polymarket API
  let pageNumber = 1;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  console.log('📊 Fetching ALL active markets from Polymarket (this may take a moment)...');

  while (true) {
    try {
      // Fetch a batch of markets (includes retry logic and validation)
      const url = `${GAMMA_API_HOST}/markets`;
      const params = new URLSearchParams({
        active: 'true',
        closed: 'false',
        archived: 'false',
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await fetchWithRetry(`${url}?${params}`);

      if (!response.ok) {
        throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response is an array
      if (!Array.isArray(data)) {
        console.error('API response is not an array:', typeof data);
        throw new Error('Invalid API response: expected array of markets');
      }

      const markets: PolymarketMarket[] = data;

      // Convert to simplified format with validation
      // Filter out any markets that fail validation
      const batch = markets
        .map(market => parseMarketToSimplified(market, 'active'))
        .filter((market): market is SimplifiedMarket => market !== null);

      // Log if we filtered out any invalid markets
      if (batch.length < markets.length) {
        console.warn(`Filtered out ${markets.length - batch.length} invalid markets`);
      }

      // Reset error counter on success
      consecutiveErrors = 0;

      // No more markets to fetch
      if (batch.length === 0) {
        console.log(`✅ Finished! Fetched all ${allMarkets.length} active markets`);
        break;
      }

      // Add this batch to our collection
      allMarkets.push(...batch);
      console.log(`   Page ${pageNumber}: Fetched ${batch.length} markets (${allMarkets.length} total so far)`);

      // If we got fewer than the limit, we've reached the last page
      if (batch.length < limit) {
        console.log(`✅ Finished! Fetched all ${allMarkets.length} active markets`);
        break;
      }

      // Move to next page
      offset += limit;
      pageNumber++;

      // Rate limiting: Wait 500ms between requests to be respectful of API
      // This prevents overwhelming Polymarket's servers
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      consecutiveErrors++;
      console.error(`❌ Error fetching page ${pageNumber} (offset ${offset}):`, error.message || error);

      // If we've hit too many consecutive errors, stop trying
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error(`❌ Hit ${MAX_CONSECUTIVE_ERRORS} consecutive errors, stopping pagination`);

        // If we've already fetched some markets, return what we have
        if (allMarkets.length > 0) {
          console.log(`⚠️  Returning ${allMarkets.length} markets fetched before errors`);
          return allMarkets;
        }

        // Otherwise, re-throw the error
        throw error;
      }

      // If we've already fetched some markets, try to continue to next page
      // (the error might be transient or specific to this page)
      if (allMarkets.length > 0) {
        console.log(`⚠️  Attempting to continue to next page despite error...`);
        offset += limit;
        pageNumber++;

        // Wait a bit longer before retrying after an error
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      // No markets fetched yet, re-throw the error
      throw error;
    }
  }

  return allMarkets;
}

/**
 * Check if a market has been resolved and get the winning outcome
 *
 * Features:
 * - 30-second request timeout
 * - Automatic retry with exponential backoff (3 retries: 2s, 4s, 8s)
 * - Data validation to ensure API response is well-formed
 * - Returns { resolved: false } for any error or invalid data
 *
 * @param marketId - Polymarket market ID
 * @returns { resolved: boolean, winner?: 'YES' | 'NO' }
 */
export async function checkMarketResolution(marketId: string): Promise<{
  resolved: boolean;
  winner?: 'YES' | 'NO';
}> {
  const url = `${GAMMA_API_HOST}/markets/${marketId}`;

  try {
    // Fetch with retry logic and timeout
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      console.log(`Market ${marketId} returned ${response.status}, treating as unresolved`);
      return { resolved: false };
    }

    const data = await response.json();

    // Validate response is an object (not array)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      console.error(`Invalid API response for market ${marketId}:`, typeof data);
      return { resolved: false };
    }

    const market: PolymarketMarket = data;

    // Validate market data structure
    if (!validateMarketData(market)) {
      console.warn(`Invalid market data for resolution check ${marketId}`);
      return { resolved: false };
    }

    const yesToken = market.tokens.find(t => t.outcome === 'Yes');
    const noToken = market.tokens.find(t => t.outcome === 'No');

    // Check if market is resolved
    if (market.resolved || yesToken?.winner !== undefined || noToken?.winner !== undefined) {
      // Determine winner
      let winner: 'YES' | 'NO' | undefined;

      if (yesToken?.winner === true) {
        winner = 'YES';
      } else if (noToken?.winner === true) {
        winner = 'NO';
      } else if (yesToken?.winner === false && noToken?.winner === false) {
        // Both marked as losers - ambiguous resolution
        console.warn(`Market ${marketId} has ambiguous resolution (both tokens marked as losers)`);
        winner = undefined;
      } else {
        // Market marked as resolved but no winner flag set
        console.warn(`Market ${marketId} marked as resolved but no winner flag set`);
        winner = undefined;
      }

      return {
        resolved: true,
        winner
      };
    }

    return { resolved: false };

  } catch (error: any) {
    console.error(`Error checking resolution for market ${marketId}:`, error.message || error);
    return { resolved: false };
  }
}
