/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  backoffFactor?: number;
  shouldRetry?: (error: Error, attemptNumber: number) => boolean;
  onRetry?: (error: Error, attemptNumber: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  shouldRetry: (error: Error) => {
    // Don't retry on certain errors
    const message = error.message.toLowerCase();
    if (
      message.includes('permission denied') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('not found')
    ) {
      return false;
    }
    return true;
  },
  onRetry: () => {},
};

/**
 * Execute a function with automatic retry on failure
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Call retry callback
      opts.onRetry(lastError, attempt);

      // Wait before retrying
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a timeout promise that rejects after a specified duration
 */
export function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message || `Operation timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Retry with timeout for each attempt
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  retryOptions: RetryOptions = {},
): Promise<T> {
  return withRetry(
    () => timeout(fn(), timeoutMs, `Operation timed out after ${timeoutMs}ms`),
    retryOptions,
  );
}
