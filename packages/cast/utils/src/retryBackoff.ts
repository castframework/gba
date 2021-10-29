import { defer, iif, MonoTypeOperatorFunction, throwError, timer } from 'rxjs';
import { concatMap, retryWhen, tap } from 'rxjs/operators';

export interface RetryBackoffConfig {
  // Initial interval. It will eventually go as high as maxInterval.
  initialInterval: number;
  // Maximum number of retry attempts.
  maxRetries?: number;
  // Maximum delay between retries.
  maxInterval?: number;
  // When set to `true` every successful emission will reset the delay and the
  // error count.
  resetOnSuccess?: boolean;
  // Conditional retry.
  shouldRetry?: (error: any) => boolean;
  backoffDelay?: (iteration: number, initialInterval: number) => number;
  tapError?: (error: any, iteration: number) => void;
}

/** Calculates the actual delay which can be limited by maxInterval */
export function getDelay(backoffDelay: number, maxInterval: number): number {
  return Math.min(backoffDelay, maxInterval);
}

/** Exponential backoff delay */
export function exponentialBackoffDelay(
  iteration: number,
  initialInterval: number,
): number {
  return Math.pow(2, iteration) * initialInterval;
}

/**
 *
 * This method an adapted version of https://github.com/alex-okrushko/backoff-rxjs
 * See https://github.com/alex-okrushko/backoff-rxjs/blob/7d38283/src/operators/retryBackoff.ts
 * We just added a way to log error with tapError
 *
 * Returns an Observable that mirrors the source Observable with the exception
 * of an error. If the source Observable calls error, rather than propagating
 * the error call this method will resubscribe to the source Observable with
 * exponentially increasing interval and up to a maximum of count
 * resubscriptions (if provided). Retrying can be cancelled at any point if
 * shouldRetry returns false.
 */
export function retryBackoff<T>(
  config: number | Partial<RetryBackoffConfig>,
): MonoTypeOperatorFunction<T> {
  const {
    initialInterval = 1000,
    maxRetries = 10,
    maxInterval = 60 * 1000,
    shouldRetry = () => true,
    resetOnSuccess = true,
    backoffDelay = exponentialBackoffDelay,
    tapError = () => {
      // noop
    },
  } = typeof config === 'number' ? { initialInterval: config } : config;
  return (source) =>
    defer(() => {
      let index = 0;
      return source.pipe(
        retryWhen<T>((errors) =>
          errors.pipe(
            concatMap((error) => {
              const attempt = index++;

              tapError(error, index);
              return iif(
                () => attempt < maxRetries && shouldRetry(error),
                timer(
                  getDelay(backoffDelay(attempt, initialInterval), maxInterval),
                ),
                throwError(error),
              );
            }),
          ),
        ),
        tap(() => {
          if (resetOnSuccess) {
            index = 0;
          }
        }),
      );
    });
}
