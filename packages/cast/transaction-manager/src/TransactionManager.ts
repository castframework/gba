import {
  AbstractTransaction,
  BlockchainDriver,
  BlockchainSpecificParamsOf,
  BlockchainSpecificTransactionInfoOf,
  BlockInfo,
  CallResult,
  CancelReceipt,
  Event,
  ListenParams,
  Logger,
  RetriableError,
  TransactionId,
  TransactionInfo,
  TransactionReceipt,
} from '@castframework/types';
import { Observable } from 'rxjs';
import { defaultConfig } from './defaultConfig';
import { RetryBackoffConfig, withRetry } from '@castframework/utils';

export interface TxRetryConfig {
  initialIntervalInMs: number;
  maxIntervalInMs: number;
  maxRetries: number;
}

export interface TransactionManagerConfig<
  Driver extends BlockchainDriver<
    BlockchainSpecificParamsOf<Driver>,
    BlockchainSpecificTransactionInfoOf<Driver>
  >,
> {
  driver: Driver;
  logger?: Logger;
  txRetryConfig?: TxRetryConfig;
}
export class TransactionManager<
  Driver extends BlockchainDriver<unknown, unknown>,
> {
  private readonly driver: Driver;
  private readonly logger: Logger;
  private readonly config: Required<TransactionManagerConfig<Driver>>;

  constructor(config: TransactionManagerConfig<Driver>) {
    this.config = { ...defaultConfig, ...config };
    this.logger = this.config.logger;
    this.driver = this.config.driver;
    this.driver.setLogger(this.logger);
  }

  public initialize(): Promise<void> {
    return this.driver.initialize();
  }

  public send<MethodParametersType extends unknown[]>(
    abstractTransaction: AbstractTransaction<
      MethodParametersType,
      BlockchainSpecificParamsOf<Driver>
    >,
  ): Promise<TransactionReceipt> {
    const retryBackoffConfig: RetryBackoffConfig = {
      initialInterval: this.config.txRetryConfig.initialIntervalInMs,
      maxInterval: this.config.txRetryConfig.maxIntervalInMs,
      maxRetries: this.config.txRetryConfig.maxRetries,
      shouldRetry: (error) => error instanceof RetriableError,
      tapError: (error, iteration) => {
        if (error instanceof RetriableError) {
          if (iteration <= this.config.txRetryConfig.maxRetries) {
            this.logger.warn(
              `send[${JSON.stringify(
                abstractTransaction,
              )}] - Transaction failed with retriable error. Retrying(retry #${iteration})`,
            );
          } else {
            this.logger.warn(
              `send[${JSON.stringify(
                abstractTransaction,
              )}] - Transaction failed with retriable error. Max retry number reached. Failing.`,
            );
          }
        }
      },
    };

    return withRetry(async () => {
      return this.driver.send(abstractTransaction);
    }, retryBackoffConfig);
  }

  public cancelTransaction(
    transactionId: TransactionId,
    blockchainSpecificParams?: BlockchainSpecificParamsOf<Driver>,
  ): Promise<CancelReceipt> {
    return this.driver.cancelTransaction(
      transactionId,
      blockchainSpecificParams,
    );
  }

  public boostTransaction(
    transactionId: TransactionId,
    blockchainSpecificParams?: BlockchainSpecificParamsOf<Driver>,
  ): Promise<TransactionReceipt> {
    return this.driver.boostTransaction(
      transactionId,
      blockchainSpecificParams,
    );
  }

  public listen<EventType extends Event<string>>(
    params: ListenParams<BlockchainSpecificParamsOf<Driver>>,
  ): Observable<EventType> {
    return this.driver.listen(params);
  }

  public getTransactionInfo(
    transactionId: TransactionId,
  ): Promise<
    TransactionInfo<
      BlockchainSpecificTransactionInfoOf<Driver>,
      BlockchainSpecificParamsOf<Driver>
    >
  > {
    return this.driver.getTransactionInfo(transactionId);
  }

  public getTransactionsInfo(): Promise<
    TransactionInfo<
      BlockchainSpecificTransactionInfoOf<Driver>,
      BlockchainSpecificParamsOf<Driver>
    >[]
  > {
    return this.driver.getTransactionsInfo();
  }

  public waitForConfirmation(transactionId: TransactionId): Promise<void> {
    return this.driver.waitForConfirmation(transactionId);
  }

  public getLastBlock(): Promise<BlockInfo> {
    return this.driver.getLastBlock();
  }

  public call<MethodParametersType extends unknown[], CallReturnType>(
    abstractCall: AbstractTransaction<
      MethodParametersType,
      BlockchainSpecificParamsOf<Driver>
    >,
  ): Promise<CallResult<CallReturnType>> {
    return this.driver.call<MethodParametersType, CallReturnType>(abstractCall);
  }

  public close(): Promise<void> {
    return this.driver.close();
  }
}
