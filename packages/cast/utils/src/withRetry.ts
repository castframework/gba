import { defer, ObservedValueOf, ObservableInput } from 'rxjs';
import { retryBackoff, RetryBackoffConfig } from './retryBackoff';

export function withRetry<R extends ObservableInput<any> | void>(
  observableFactory: () => R,
  retryBackoffConfig: number | Partial<RetryBackoffConfig>,
): Promise<ObservedValueOf<R>> {
  return defer(observableFactory)
    .pipe(retryBackoff(retryBackoffConfig))
    .toPromise();
}
