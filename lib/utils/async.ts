export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let index = 0; index <= maxRetries; index += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (index < maxRetries) {
        const delay = baseDelay * Math.pow(2, index);
        console.log(`Retry ${index + 1}/${maxRetries} after ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Retry failed without an error');
}
