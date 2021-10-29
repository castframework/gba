import { TransactionManagerConfig } from './TransactionManager';
import { trashBinLogger } from '@castframework/utils';

type OptionalKeys<T> = {
  [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? K : never;
}[keyof T];

export const defaultConfig: Required<
  Pick<
    TransactionManagerConfig<any>,
    OptionalKeys<TransactionManagerConfig<any>>
  >
> = {
  logger: trashBinLogger,
  txRetryConfig: {
    initialIntervalInMs: 1000,
    maxIntervalInMs: 2000,
    maxRetries: 50,
  },
};
