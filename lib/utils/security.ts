/**
 * Security Utilities
 * 
 * Security-related helper functions for authentication and validation.
 */

/**
 * Constant-time string comparison to prevent timing attacks
 * 
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');
  
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  
  let mismatch = 0;
  for (let i = 0; i < aBuffer.length; i++) {
    mismatch |= aBuffer[i] ^ bBuffer[i];
  }
  
  return mismatch === 0;
}

/**
 * Verify cron secret with constant-time comparison
 * 
 * @param providedSecret Secret provided in request
 * @param expectedSecret Expected secret from environment
 * @returns true if secrets match
 */
export function verifyCronSecret(providedSecret: string, expectedSecret: string): boolean {
  return constantTimeCompare(providedSecret, expectedSecret);
}

/**
 * Verify admin password with constant-time comparison
 * 
 * @param providedPassword Password provided in request
 * @param expectedPassword Expected password from environment
 * @returns true if passwords match
 */
export function verifyAdminPassword(providedPassword: string, expectedPassword: string): boolean {
  return constantTimeCompare(providedPassword, expectedPassword);
}

