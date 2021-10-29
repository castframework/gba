import { EthereumNodeTransactionInfoProviderFactory } from './transaction-info-provider/node/EthereumNodeTransactionInfoProviderFactory';
import { EthereumConfig } from './types';

type OptionalKeys<T> = {
  [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? K : never;
}[keyof T];

export const defaultConfig: Required<
  Pick<EthereumConfig, OptionalKeys<EthereumConfig>>
> = {
  numberOfConfirmation: 5,
  eventDelayInBlocks: 5,
  keepAliveIntervalInSeconds: 10,
  subscriptionsLogIntervalInSeconds: 10,
  // txRetryInitialIntervalInMs: 1000,
  // txRetryMaxIntervalInMs: 1000,
  // txRetryMaxRetries: 10,
  minGasPriceInGWei: 100,
  maxGasPriceInGWei: 350,
  gasPriceFactor: 1.2,
  transactionBoostFactor: 1.2,
  routineCallLoggingPeriod: 0,
  transactionInfoProviderFactory:
    new EthereumNodeTransactionInfoProviderFactory(),
};
