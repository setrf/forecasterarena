/**
 * Application Constants and Configuration
 * 
 * Central configuration for Forecaster Arena.
 * All magic numbers and configuration values are defined here.
 * 
 * @module constants
 */

// ============================================================================
// BETTING CONFIGURATION
// ============================================================================

/**
 * Initial balance for each agent in a new cohort
 * Each LLM starts with $10,000 virtual dollars
 */
export const INITIAL_BALANCE = 10000;

/**
 * Minimum bet size in dollars
 * Bets below this are rejected
 */
export const MIN_BET = 50;

/**
 * Maximum bet as percentage of current cash balance
 * Agents cannot bet more than 25% of their cash on a single market
 */
export const MAX_BET_PERCENT = 0.25;

/**
 * Number of top markets by volume to show to LLMs
 * Limits context size while focusing on most liquid markets
 */
export const TOP_MARKETS_COUNT = 100;

// ============================================================================
// LLM CONFIGURATION
// ============================================================================

/**
 * Temperature for LLM API calls
 * 0 = deterministic (reproducible results)
 */
export const LLM_TEMPERATURE = 0;

/**
 * Maximum tokens for LLM response
 */
export const LLM_MAX_TOKENS = 2000;

/**
 * Request timeout in milliseconds
 */
export const LLM_TIMEOUT_MS = 120000; // 2 minutes

/**
 * Number of retries for malformed responses
 */
export const LLM_MAX_RETRIES = 1;

// ============================================================================
// SCHEDULING
// ============================================================================

/**
 * Day of week for decisions (0 = Sunday)
 */
export const DECISION_DAY = 0;

/**
 * Hour (UTC) for decisions
 */
export const DECISION_HOUR_UTC = 0;

// ============================================================================
// METHODOLOGY
// ============================================================================

/**
 * Current methodology version
 * Increment when making breaking changes to the benchmark
 */
export const METHODOLOGY_VERSION = 'v1';

// ============================================================================
// MODEL DEFINITIONS
// ============================================================================

/**
 * The 7 competing LLM models
 * 
 * Each model is identified by:
 * - id: Internal identifier (used in database)
 * - openrouterId: OpenRouter API model identifier
 * - displayName: Human-readable name for UI
 * - provider: Company that created the model
 * - color: Hex color for charts
 */
export const MODELS = [
  {
    id: 'gpt-5.1',
    openrouterId: 'openai/gpt-5.1',
    displayName: 'GPT-5.1',
    provider: 'OpenAI',
    color: '#10B981' // Emerald
  },
  {
    id: 'gemini-3-pro',
    openrouterId: 'google/gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro',
    provider: 'Google',
    color: '#3B82F6' // Blue
  },
  {
    id: 'grok-4',
    openrouterId: 'x-ai/grok-4',
    displayName: 'Grok 4',
    provider: 'xAI',
    color: '#8B5CF6' // Violet
  },
  {
    id: 'claude-opus-4.5',
    openrouterId: 'anthropic/claude-opus-4.5',
    displayName: 'Claude Opus 4.5',
    provider: 'Anthropic',
    color: '#F59E0B' // Amber
  },
  {
    id: 'deepseek-v3',
    openrouterId: 'deepseek/deepseek-v3-0324',
    displayName: 'DeepSeek V3',
    provider: 'DeepSeek',
    color: '#EF4444' // Red
  },
  {
    id: 'kimi-k2',
    openrouterId: 'moonshotai/kimi-k2-thinking',
    displayName: 'Kimi K2',
    provider: 'Moonshot AI',
    color: '#EC4899' // Pink
  },
  {
    id: 'qwen-3',
    openrouterId: 'qwen/qwen3-235b-a22b-instruct-2507',
    displayName: 'Qwen 3',
    provider: 'Alibaba',
    color: '#06B6D4' // Cyan
  }
] as const;

/**
 * Type for model IDs
 */
export type ModelId = typeof MODELS[number]['id'];

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

/**
 * OpenRouter API Key from environment
 */
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Cron job authentication secret
 */
export const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Admin dashboard password
 */
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * Site URL for API headers
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Site name for API headers
 */
export const SITE_NAME = 'Forecaster Arena';

/**
 * GitHub repository URL
 * Update this when the repository is created
 */
export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/forecasterarena/forecasterarena';

// ============================================================================
// API CONFIGURATION
// ============================================================================

/**
 * Polymarket Gamma API base URL
 */
export const POLYMARKET_GAMMA_API_HOST = 'https://gamma-api.polymarket.com';

/**
 * OpenRouter API base URL
 */
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Rate limiting delays (in ms)
 */
export const API_DELAYS = {
  POLYMARKET_BETWEEN_REQUESTS: 500, // 500ms between Polymarket requests
  OPENROUTER_BETWEEN_REQUESTS: 1000, // 1s between OpenRouter requests
  RETRY_BASE_DELAY: 2000, // 2s base delay for retries
  RETRY_MAX_DELAY: 30000 // 30s max delay
};

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

/**
 * Default database path (relative to project root)
 */
export const DEFAULT_DB_PATH = 'data/forecaster.db';

/**
 * Default backup path (relative to project root)
 */
export const DEFAULT_BACKUP_PATH = 'backups';

// ============================================================================
// UI CONFIGURATION
// ============================================================================

/**
 * Number of recent decisions to show in feed
 */
export const RECENT_DECISIONS_LIMIT = 20;

/**
 * Chart time range options
 */
export const CHART_TIME_RANGES = ['1W', '1M', '3M', 'ALL'] as const;

/**
 * Default chart time range
 */
export const DEFAULT_CHART_RANGE = '1M';

// ============================================================================
// MARKET CATEGORIES
// ============================================================================

/**
 * Known market categories from Polymarket
 */
export const MARKET_CATEGORIES = [
  'Politics',
  'Crypto',
  'Sports',
  'Pop Culture',
  'Business',
  'Science',
  'Technology',
  'World Affairs',
  'Other'
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get model configuration by ID
 */
export function getModelById(id: string) {
  return MODELS.find(m => m.id === id);
}

/**
 * Get model configuration by OpenRouter ID
 */
export function getModelByOpenRouterId(openrouterId: string) {
  return MODELS.find(m => m.openrouterId === openrouterId);
}

/**
 * Calculate maximum bet for a given cash balance
 */
export function calculateMaxBet(cashBalance: number): number {
  return cashBalance * MAX_BET_PERCENT;
}

/**
 * Validate bet amount against constraints
 */
export function validateBetAmount(amount: number, cashBalance: number): {
  valid: boolean;
  error?: string;
  adjustedAmount?: number;
} {
  if (amount < MIN_BET) {
    return { valid: false, error: `Minimum bet is $${MIN_BET}` };
  }
  
  const maxBet = calculateMaxBet(cashBalance);
  
  if (amount > maxBet) {
    return { 
      valid: true, 
      adjustedAmount: maxBet,
      error: `Amount capped to maximum of $${maxBet.toFixed(2)} (25% of balance)`
    };
  }
  
  if (amount > cashBalance) {
    return { valid: false, error: 'Insufficient balance' };
  }
  
  return { valid: true };
}

