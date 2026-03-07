/**
 * External API endpoints and throttling.
 */
export const POLYMARKET_GAMMA_API_HOST = 'https://gamma-api.polymarket.com';
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const API_DELAYS = {
  POLYMARKET_BETWEEN_REQUESTS: 500,
  OPENROUTER_BETWEEN_REQUESTS: 1000,
  RETRY_BASE_DELAY: 2000,
  RETRY_MAX_DELAY: 30000
};
