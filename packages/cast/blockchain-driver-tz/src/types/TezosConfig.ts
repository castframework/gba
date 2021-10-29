import { OperatorFunction } from 'rxjs';
import { TransactionInfoProviderFactory } from '@castframework/types';
import { TezosBlockchainDriver } from '../TezosBlockchainDriver';

export type TezosConfig = {
  pollingIntervalInSeconds: number;
  confirmationPollingIntervalSecond?: number;
  confirmationPollingTimeoutSecond?: number;
  defaultConfirmationCount?: number;
  shouldObservableSubscriptionRetry?: boolean;
  observableSubscriptionRetryFunction?: OperatorFunction<any, any>;
  transactionInfoProviderFactory?: TransactionInfoProviderFactory<TezosBlockchainDriver>;
};
