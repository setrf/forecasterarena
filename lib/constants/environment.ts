/**
 * Environment-derived configuration.
 */
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const CRON_SECRET = process.env.CRON_SECRET || (IS_PRODUCTION ? '' : 'dev-secret');
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (IS_PRODUCTION ? '' : 'admin');
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const SITE_NAME = 'Forecaster Arena';
export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/setrf/forecasterarena';

if (typeof window === 'undefined' && IS_PRODUCTION) {
  const warningFlag = '__forecaster_security_warnings_logged__';
  const globalRef = globalThis as typeof globalThis & { [warningFlag]?: boolean };

  if (!globalRef[warningFlag]) {
    if (!process.env.CRON_SECRET) {
      console.error('SECURITY WARNING: CRON_SECRET is not set in production.');
      console.error('Cron routes will reject all requests until this is configured.');
    }

    if (!process.env.ADMIN_PASSWORD) {
      console.error('SECURITY WARNING: ADMIN_PASSWORD is not set in production.');
      console.error('Admin login/session verification will be disabled until this is configured.');
    }

    if (!OPENROUTER_API_KEY) {
      console.error('SECURITY WARNING: OPENROUTER_API_KEY is not set in production.');
      console.error('OpenRouter-dependent routes will fail until this is configured.');
    }

    globalRef[warningFlag] = true;
  }
}
