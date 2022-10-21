import { TransactionInfoProviderFactory } from '@castframework/types';
import { EthereumBlockchainDriver } from '../EthereumBlockchainDriver';

export type EthereumConfig = {
  numberOfConfirmation?: number;
  eventDelayInBlocks?: number;
  keepAliveIntervalInSeconds?: number;
  subscriptionsLogIntervalInSeconds?: number;
  // These should be moved to the transaction manager
  // txRetryInitialIntervalInMs?: number;
  // txRetryMaxIntervalInMs?: number;
  // txRetryMaxRetries?: number;
  minGasPriceInGWei?: number;
  maxGasPriceInGWei?: number;
  gasPriceFactor?: number;
  transactionBoostFactor?: number;
  /*
    routineCallLoggingPeriod=5 means log 1 every 5 routine call
    routineCallLoggingPeriod=0 disable it
    */
  routineCallLoggingPeriod?: number;
  transactionInfoProviderFactory?: TransactionInfoProviderFactory<EthereumBlockchainDriver>;
  useEIP1559?: boolean;
  priorityFeeInGwei?: number;
};
