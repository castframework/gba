import { TezosNodeTransactionInfoProviderFactory } from './transaction-info-provider/node/TezosNodeTransactionInfoProviderFactory';
import { TezosConfig } from './types';
import { retryBackoff, exponentialBackoffDelay } from '@castframework/utils';

type OptionalKeys<T> = {
  [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? K : never;
}[keyof T];

export const defaultConfig: Required<
  Pick<TezosConfig, OptionalKeys<TezosConfig>>
> = {
  confirmationPollingIntervalSecond: 5,
  confirmationPollingTimeoutSecond: 180,
  defaultConfirmationCount: 5,
  shouldObservableSubscriptionRetry: true,
  observableSubscriptionRetryFunction: retryBackoff({
    initialInterval: 1000,
    maxInterval: 10000,
    maxRetries: Number.MAX_SAFE_INTEGER,
    backoffDelay: exponentialBackoffDelay,
    tapError: (error, iteration) => {
      console.error(
        `An error occured getting last block, Retrying(retry #${iteration})`,
      );
    },
  }),
  transactionInfoProviderFactory: new TezosNodeTransactionInfoProviderFactory(
    0,
    1000,
  ),
};
