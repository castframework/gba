import {
  AbstractTransaction,
  BlockchainDriver,
  BlockchainDriverParams,
  BlockInfo,
  CallResult,
  Event,
  isFinal,
  ListenParams,
  Logger,
  RetriableError,
  TransactionId,
  TransactionInfo,
  TransactionInfoProvider,
  TransactionReceipt,
  TransactionStatus,
} from '@castframework/types';
import { from, Observable, of, ReplaySubject } from 'rxjs';
import {
  EthereumConfig,
  EthereumSignedTx,
  EthereumSpecificParams,
  EthereumTx,
  EthereumSpecificTransactionInfo,
} from './types';
import Web3 from 'web3';
import { WebsocketProviderOptions } from 'web3-core-helpers';
import { BlockHeader } from 'web3-eth';
import { ContractSendMethod } from 'web3-eth-contract';
import { isContractSendMethod, waitFor } from './utils';
import {
  EventLog,
  WebsocketProvider,
  TransactionReceipt as Web3TransactionReceipt,
} from 'web3-core';
import { Subscription } from 'web3-core-subscriptions';
import { defaultConfig } from './defaultConfig';
import { filter, mapTo, switchMap, switchMapTo, tap } from 'rxjs/operators';

import { errorAsString } from './utils/errorAsString';
import parseReceiptEvents from 'web3-parse-receipt-events';
import {
  addHexPrefix,
  bufferToHex,
  publicToAddress,
  toBuffer,
} from 'ethereumjs-util';

export { Logger } from 'log4js';

const ONE_BILLION = 1000000000;

export class EthereumBlockchainDriver
  implements
    BlockchainDriver<EthereumSpecificParams, EthereumSpecificTransactionInfo>
{
  private static NONCE_ERRORS = [
    'nonce too low',
    'nonce too high',
    'replacement transaction underpriced',
    "the tx doesn't have the correct nonce",
  ];
  private static CONNECTION_ERRORS = ['connection not open on send()'];

  private closed: boolean;
  private keepAliveInterval: NodeJS.Timeout;
  private subscriptionsLoggerInterval: NodeJS.Timeout;
  private currentBlockHeader: BlockHeader | null = null;
  private logger: Logger;
  private web3: Web3;
  private nodeUrl: string;
  private config: Required<EthereumConfig>;
  private transactionInfoProvider: TransactionInfoProvider<EthereumBlockchainDriver>;
  private currentTransactionInfos: Map<
    string,
    TransactionInfo<EthereumSpecificTransactionInfo, EthereumSpecificParams>
  >;
  private transactionObservable: Map<string, ReplaySubject<TransactionStatus>>;

  constructor(
    private readonly params: BlockchainDriverParams<
      EthereumTx,
      EthereumSignedTx,
      EthereumConfig
    >,
  ) {
    this.nodeUrl = this.params.nodeURL;
    this.config = {
      ...defaultConfig,
      ...this.params.config,
    };
    this.currentTransactionInfos = new Map<
      string,
      TransactionInfo<EthereumSpecificTransactionInfo, EthereumSpecificParams>
    >();
    this.transactionObservable = new Map<
      string,
      ReplaySubject<TransactionStatus>
    >();
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.trace(
      `Starting initialization with config[${JSON.stringify(
        this.config,
      )}] signingAddress[${await this.getAddress()}]`,
    );
    this.web3 = this.getWeb3Instance(this.params.config);
    await this.startKeepAlive();
    await this.startLoggingSubscriptions();
    this.transactionInfoProvider =
      this.config.transactionInfoProviderFactory.getTransactionProvider(
        this,
        this.logger,
      );
    this.logger.trace('Finished initialization');
  }

  public getWeb3(): Web3 {
    return this.web3;
  }

  public async boostTransaction(
    transactionId: TransactionId,
    blockchainSpecificParams?: EthereumSpecificParams,
  ): Promise<TransactionReceipt> {
    if (!this.web3) {
      await this.initialize();
    }
    // 1) prepare and send replacement transaction (with replacedTransactionId = transactionId)
    const transactionInfo = await this.getTransactionInfo(transactionId);
    if (transactionInfo.status !== TransactionStatus.PENDING) {
      throw new Error(
        `Only pending transactions can be boosted. Transaction with id[${transactionId}] has status[${transactionInfo.status}]`,
      );
    }
    if (
      transactionInfo.blockchainSpecificTransactionInfo === undefined ||
      transactionInfo.blockchainSpecificTransactionInfo?.gasPrice === undefined
    ) {
      throw new Error('Current transaction parameters not available');
    }
    if (transactionInfo.details === undefined) {
      throw new Error('Current transaction details not available');
    }
    const currentGasPrice =
      transactionInfo.blockchainSpecificTransactionInfo?.gasPrice;
    const boostedGasPrice =
      blockchainSpecificParams?.gasPrice ??
      Math.ceil(currentGasPrice * this.config.transactionBoostFactor);
    const replacementTransaction = { ...transactionInfo.details };
    replacementTransaction.nonce = transactionInfo.nonce;
    replacementTransaction.blockchainSpecificParams = {
      ...transactionInfo.details.blockchainSpecificParams,
      gasPrice: boostedGasPrice,
    };
    return this.replaceTransaction(transactionInfo, replacementTransaction);
  }

  public async cancelTransaction(
    transactionId: TransactionId,
    blockchainSpecificParams?: EthereumSpecificParams,
  ): Promise<TransactionReceipt> {
    if (!this.web3) {
      await this.initialize();
    }
    // 1) prepare and send cancel transaction (with replacedTransactionId = transactionId)
    const transactionInfo = await this.getTransactionInfo(transactionId);
    if (transactionInfo.status !== TransactionStatus.PENDING) {
      throw new Error(
        `Only pending transactions can be cancelled. Transaction with id[${transactionId}] has status[${transactionInfo.status}]`,
      );
    }
    if (
      transactionInfo.blockchainSpecificTransactionInfo === undefined ||
      transactionInfo.blockchainSpecificTransactionInfo?.gasPrice === undefined
    ) {
      throw new Error('Current transaction parameters not available');
    }
    const boostedGasPrice =
      blockchainSpecificParams?.gasPrice ??
      this.config.maxGasPriceInGWei * ONE_BILLION;

    const cancelTransaction: AbstractTransaction<
      unknown[],
      EthereumSpecificParams
    > = {
      to: await this.getAddress(),
      value: 0,
      nonce: transactionInfo.nonce,
      blockchainSpecificParams: {
        gasPrice: boostedGasPrice,
      },
    };
    return this.replaceTransaction(transactionInfo, cancelTransaction);
  }

  private async replaceTransaction(
    originalTransactionInfo: TransactionInfo<
      EthereumSpecificTransactionInfo,
      EthereumSpecificParams
    >,
    replacementTransaction: AbstractTransaction<
      unknown[],
      EthereumSpecificParams
    >,
  ): Promise<TransactionReceipt> {
    replacementTransaction.replacedTransactionId = originalTransactionInfo.id;
    const replacementTransactionReceipt = await this.send(
      replacementTransaction,
    );
    originalTransactionInfo.replacementTransactionId =
      replacementTransactionReceipt.transactionId;
    this.waitForConfirmation(replacementTransactionReceipt.transactionId)
      .then(() => {
        originalTransactionInfo.status = TransactionStatus.CANCELLED;
        originalTransactionInfo.lastStatusTimestamp = new Date();
      })
      .catch((error) =>
        this.logger.error(
          `Error waiting for confirmation of transaction with id ${
            replacementTransactionReceipt.transactionId
          }: ${errorAsString(error)}`,
        ),
      );
    return replacementTransactionReceipt;
  }

  public async call<MethodParametersType extends unknown[], CallResultType>(
    abstractCall: AbstractTransaction<
      MethodParametersType,
      EthereumSpecificParams
    >,
  ): Promise<CallResult<CallResultType>> {
    if (!this.web3) {
      await this.initialize();
    }
    const {
      to,
      blockchainSpecificParams,
      methodName,
      methodParameters = [],
    } = abstractCall;

    this.logger.trace(`call with params ${JSON.stringify(abstractCall)}`);

    if (methodName === undefined) {
      throw new Error(`call can only handle smart contract calls`);
    }

    if (
      blockchainSpecificParams?.abi === null ||
      blockchainSpecificParams?.abi === undefined
    ) {
      throw new Error('Missing abi');
    }

    const web3Contract = new this.web3.eth.Contract(
      blockchainSpecificParams.abi,
      to,
    );

    // Build Web3 Transaction object

    const web3Transaction = web3Contract.methods[methodName](
      ...methodParameters,
    ) as unknown; // Better unknown than any

    if (!isContractSendMethod(web3Transaction)) {
      throw new Error('Bad transaction returned from web3');
    }

    // this.logger.debug(
    //   `EthContract[${smartContractAddress}] - Estimated gas : ${gas}`,
    // );

    const gas = await this.estimateGas(abstractCall, web3Transaction);

    const returnFromCall = await this.doCallOnWeb3Transaction<CallResultType>(
      abstractCall,
      web3Transaction,
      gas,
    );

    return returnFromCall;
  }

  public async getLastBlock(): Promise<BlockInfo> {
    if (!this.web3) {
      await this.initialize();
    }
    if (this.currentBlockHeader === null) {
      this.currentBlockHeader = await this.web3.eth.getBlock('latest');
    }
    return {
      blockNumber: this.currentBlockHeader.number,
      blockHash: this.currentBlockHeader.hash,
    };
  }

  public async waitForConfirmation(
    transactionId: TransactionId,
  ): Promise<void> {
    if (!this.web3) {
      await this.initialize();
    }
    this.logger.trace(
      `waitForConfirmation with transactionId[${transactionId}]`,
    );
    const knownTransaction = this.transactionObservable.get(transactionId);
    if (knownTransaction !== undefined) {
      this.logger.trace(
        `waitForConfirmation with transactionId[${transactionId}]: transaction is local`,
      );
      return knownTransaction
        .pipe(
          filter((status) => status !== TransactionStatus.PENDING),
          tap((status) => {
            this.logger.trace(
              `waitForConfirmation with transactionId[${transactionId}]: local transaction status changed to ${status}`,
            );
            if (status === TransactionStatus.REJECTED) {
              throw new Error(`Transaction[${transactionId}] rejected`);
            }
          }),
          mapTo(undefined),
        )
        .toPromise();
    }
    this.logger.trace(
      `waitForConfirmation with transactionId[${transactionId}]: transaction is external`,
    );
    await waitFor(
      async () => {
        const transactionInfo = await this.getTransactionInfo(transactionId);
        return transactionInfo.status !== TransactionStatus.PENDING;
      },
      1000, // todo: à rendre configurable
      Number.POSITIVE_INFINITY, // todo: à rendre configurable ?
    );
    const transactionInfo = await this.getTransactionInfo(transactionId);
    this.logger.trace(
      `waitForConfirmation with transactionId[${transactionId}]: external transaction status changed to ${transactionInfo.status}`,
    );
    if (transactionInfo.status === TransactionStatus.REJECTED) {
      throw new Error(`Transaction rejected`);
    }
  }

  public async getTransactionInfo(
    transactionId: TransactionId,
  ): Promise<
    TransactionInfo<EthereumSpecificTransactionInfo, EthereumSpecificParams>
  > {
    if (!this.web3) {
      await this.initialize();
    }
    this.logger.trace(
      `getTransactionInfo with transactionId[${transactionId}]`,
    );
    const knownTransactionInfo =
      this.currentTransactionInfos.get(transactionId);
    if (knownTransactionInfo !== undefined) {
      this.logger.trace(
        `getTransactionInfo with transactionId[${transactionId}]: transaction is local with info[${JSON.stringify(
          knownTransactionInfo,
        )}]`,
      );
      return knownTransactionInfo;
    }
    this.logger.trace(
      `getTransactionInfo with transactionId[${transactionId}]: transaction is external`,
    );
    const foundTransactionInfo =
      await this.transactionInfoProvider.getTransactionInfo(transactionId);
    if (foundTransactionInfo !== undefined) {
      this.logger.trace(
        `getTransactionInfo with transactionId[${transactionId}]: external transaction found with info[${JSON.stringify(
          foundTransactionInfo,
        )}]`,
      );
      if (isFinal(foundTransactionInfo.status)) {
        this.currentTransactionInfos.set(transactionId, foundTransactionInfo);
      }

      return foundTransactionInfo;
    }
    this.logger.trace(
      `getTransactionInfo with transactionId[${transactionId}]: external transaction not found in the blockchain`,
    );
    throw new Error(`Transaction with id[${transactionId}] unknown`);
  }

  public async getTransactionsInfo(): Promise<
    TransactionInfo<EthereumSpecificTransactionInfo, EthereumSpecificParams>[]
  > {
    if (!this.web3) {
      await this.initialize();
    }
    return [...this.currentTransactionInfos.values()];
  }

  public listen<EventType extends Event<string>>(
    params: ListenParams<EthereumSpecificParams>,
  ): Observable<EventType> {
    return of(this.web3).pipe(
      switchMap((web3) => {
        if (web3 === undefined) {
          return from(this.initialize()).pipe(
            switchMapTo(this._listen<EventType>(params)),
          );
        }

        return this._listen<EventType>(params);
      }),
    );
  }

  private _listen<EventType extends Event<string>>(
    params: ListenParams<EthereumSpecificParams>,
  ): Observable<EventType> {
    const { smartContractAddress, eventName, blockchainSpecificParams, from } =
      params;

    if (
      blockchainSpecificParams?.abi === null ||
      blockchainSpecificParams?.abi === undefined
    ) {
      throw new Error('Missing abi');
    }

    const web3Contract = new this.web3.eth.Contract(
      blockchainSpecificParams.abi,
      smartContractAddress,
    );

    const eventEmitter = web3Contract.events[eventName];

    if (!eventEmitter) {
      throw new Error(
        `EthContract[${smartContractAddress}] - Cannot listen to eventName[${eventName}] as it seems it does not exist`,
      );
    }

    const observable = new Observable<EventType>((subscriber) => {
      const subscription: Subscription<EventLog> = eventEmitter({
        fromBlock: from,
      });

      subscription
        .on('data', async (eventLog: EventLog) => {
          this.logger.debug(`Received raw event : ${JSON.stringify(eventLog)}`);
          // Filter Null event
          if (eventLog.event) {
            const eventBlockNumber = eventLog.blockNumber;
            const currentBlockHeader = await this.web3.eth.getBlock('latest');
            const currentBlockNumber = currentBlockHeader.number;
            const notificationBlockNumber =
              eventBlockNumber + this.config.eventDelayInBlocks;

            this.logger.debug(
              `Received event[${JSON.stringify(
                eventLog.event,
              )}] with blockNumber[${eventBlockNumber}] - current blockNumber is[${currentBlockNumber}] - will notify at blockNumber[${notificationBlockNumber}]`,
            );

            if (notificationBlockNumber > currentBlockNumber) {
              this.logger.debug(
                `event[${JSON.stringify(
                  eventLog.event,
                )}] - Waiting for blockNumber[${notificationBlockNumber}] to notify event`,
              );
              await waitFor(
                async () => {
                  const currentBlockHeader = await this.web3.eth.getBlock(
                    'latest',
                  );
                  return currentBlockHeader.number >= notificationBlockNumber;
                },
                1000,
                30 * 60 * 1000,
              );
              // todo : add a check that event is still valid (i.e. event block hash is still part of the blockchain)
              // e.g. this.blockchain.getBlock(contractEvent.blockHash) !== null
              this.logger.debug(
                `event[${JSON.stringify(
                  eventLog.event,
                )}] - notificationBlockNumber[${notificationBlockNumber}] reached. Forwarding event to client.`,
              );
            }
            //this.logger.error(
            //  `event[${JSON.stringify(
            //    contractEvent,
            //  )}] - Error while waiting for block ${notificationBlockNumber} : ${e}`,
            //);

            const event = {
              eventName: eventLog.event,
              blockNumber: eventLog.blockNumber,
              payload: eventLog.returnValues as unknown,
              transactionId: eventLog.transactionHash,
              blockHash: eventLog.blockHash,
              smartContractAddress: eventLog.address,
            } as unknown as EventType;

            subscriber.next(event);
          }
        })
        .on('connected', (subscriptionId: string) => {
          this.logger.debug(
            `EthContract[${smartContractAddress}] - Received connected for eventName[${eventName}] with subscriptionId[${subscriptionId}]`,
          );
        })
        .on('changed', (event: unknown) => {
          this.logger.warn(
            `EthContract[${smartContractAddress}] - Received changed for eventName[${eventName}] with event[${JSON.stringify(
              event,
            )}]`,
          );
        })
        .on('error', (error: unknown) => {
          this.logger.error(
            `EthContract[${smartContractAddress}] - Received error for eventName[${eventName}] with error[${JSON.stringify(
              error,
            )}]`,
          );
        });
    });

    return observable;
  }

  public async send<MethodParametersType extends unknown[]>(
    abstractTransaction: AbstractTransaction<
      MethodParametersType,
      EthereumSpecificParams
    >,
  ): Promise<TransactionReceipt> {
    try {
      if (!this.web3) {
        await this.initialize();
      }
      const {
        to,
        blockchainSpecificParams,
        methodName,
        methodParameters,
        transactionParams,
      } = abstractTransaction;

      this.logger.trace(
        `Send with params ${JSON.stringify(abstractTransaction)}`,
      );

      if (transactionParams?.previousTransactions) {
        this.logger.trace(
          `waitForConfirmation for previous transactions: [${transactionParams.previousTransactions}]`,
        );
        await transactionParams.previousTransactions.forEach(
          async (previousTransaction) => {
            await this.waitForConfirmation(previousTransaction);
          },
        );
      }

      const transactionArguments = await this.computeTransactionArguments(
        abstractTransaction,
      );

      let data = '';
      let gas = blockchainSpecificParams?.gasLimit;
      // smart contract call
      if (methodName !== undefined && methodParameters !== undefined) {
        const smartContractAddress = to;
        // this.logger.debug(
        //   `EthContract[${
        //     abstractTransaction.smartContractAddress
        //   }] - Tx arguments : ${JSON.stringify(transactionArguments)}`,
        // );

        // Build Web3 Contract object

        if (
          blockchainSpecificParams?.abi === null ||
          blockchainSpecificParams?.abi === undefined
        ) {
          throw new Error('Missing abi');
        }

        const web3Contract = new this.web3.eth.Contract(
          blockchainSpecificParams.abi,
          smartContractAddress,
        );

        // Build Web3 Transaction object

        const web3Transaction = web3Contract.methods[methodName](
          ...methodParameters,
        ) as unknown; // Better unknown than any

        if (!isContractSendMethod(web3Transaction)) {
          throw new Error('Bad transaction returned from web3');
        }

        if (gas === undefined) {
          gas = await this.estimateGas(abstractTransaction, web3Transaction);
        }

        // this.logger.debug(
        //   `EthContract[${smartContractAddress}] - Estimated gas : ${gas}`,
        // );

        await this.doCallOnWeb3Transaction(
          abstractTransaction,
          web3Transaction,
          gas,
        );

        // this.logger.debug(
        //   `EthContract[${smartContractAddress}] - Call return : ${returnFromCall}`,
        // );

        data = await web3Transaction.encodeABI();
      } else if (gas === undefined) {
        // simple transfer
        gas = await this.web3.eth.estimateGas({ ...transactionArguments });
      }

      const transaction: EthereumTx = {
        ...transactionArguments,
        data,
        gas,
        chainId: await this.web3.eth.getChainId(),
      };
      this.logger.trace(`Sending transaction: ${JSON.stringify(transaction)}`);

      const signedTransaction = await this.params.signer.sign(transaction);

      try {
        const sendBlockNumber = (await this.getLastBlock()).blockNumber;
        const transactionHash = await this.broadcast(
          abstractTransaction,
          signedTransaction,
        );

        const transactionInfo: TransactionInfo<
          EthereumSpecificTransactionInfo,
          EthereumSpecificParams
        > = {
          id: transactionHash,
          nonce: transactionArguments.nonce,
          status: TransactionStatus.PENDING,
          lastStatusTimestamp: new Date(),
          sendTimestamp: new Date(),
          sendBlockNumber,
          details: abstractTransaction,
          blockchainSpecificTransactionInfo: {
            gasLimit: gas,
            gasPrice: transactionArguments.gasPrice,
          },
          replacedTransactionId: abstractTransaction.replacedTransactionId,
        };
        this.currentTransactionInfos.set(transactionHash, transactionInfo);
        this.transactionObservable.set(
          transactionHash,
          new ReplaySubject<TransactionStatus>(1),
        );
        this.transactionObservable
          .get(transactionHash)
          ?.next(TransactionStatus.PENDING);

        return {
          transactionId: transactionHash,
        };
      } catch (e) {
        // TODO: log
        throw e;
      }
    } catch (error) {
      if (this.isRetriable(error)) {
        throw new RetriableError(error);
      } else {
        throw error;
      }
    }
  }

  private isRetriable(error: any): boolean {
    return (
      error instanceof Error &&
      (this.isNonceIssue(error) || this.isConnectionIssue(error))
    );
  }

  private isNonceIssue(error: Error): boolean {
    return EthereumBlockchainDriver.NONCE_ERRORS.some((message) =>
      error.message.includes(message),
    );
  }

  private isConnectionIssue(error: Error): boolean {
    return EthereumBlockchainDriver.CONNECTION_ERRORS.some((message) =>
      error.message.includes(message),
    );
  }

  public async close(): Promise<void> {
    this.closed = true;
    this.logger.debug('Closing connection');
    clearInterval(this.keepAliveInterval);
    clearInterval(this.subscriptionsLoggerInterval);
    const w3 = this.web3 as any;
    w3?.eth?.clearSubscriptions();
    w3?.currentProvider?.removeAllListeners();
    w3?.currentProvider?.disconnect();
  }

  private async startKeepAlive(): Promise<void> {
    if (this.config.keepAliveIntervalInSeconds > 0) {
      let routineCallLoggingCounter: number;
      // setup routine call to keep the websocket alive
      this.keepAliveInterval = setInterval(async () => {
        if (
          this.web3 &&
          this.web3.currentProvider &&
          (this.web3.currentProvider as WebsocketProvider).connected
        ) {
          if (
            routineCallLoggingCounter === undefined ||
            routineCallLoggingCounter >= this.config.routineCallLoggingPeriod
          ) {
            this.logger.trace(
              'Performing routine call to keep websocket alive',
            );
            routineCallLoggingCounter = 1;
          } else {
            routineCallLoggingCounter++;
          }
          try {
            await this.web3.eth.getBlockNumber();
          } catch (e) {
            this.logger.error(`Error during routine call ${e.toString()}`);
          } // just to avoid promise rejection errors. Connection issue
        }
      }, this.config.keepAliveIntervalInSeconds * 1000);
    }
  }

  private async startLoggingSubscriptions(): Promise<void> {
    if (this.config.subscriptionsLogIntervalInSeconds > 0) {
      let activeSubscriptionLoggingCounter: number;

      this.subscriptionsLoggerInterval = setInterval(async () => {
        if (this.web3 && (this.web3 as any)._requestManager) {
          const subscriptions = (this.web3 as any)._requestManager
            .subscriptions;

          // log active subscriptions to enable finer debugging
          const loggableSubscriptions = [...subscriptions.values()]
            .filter((sub) => sub?.subscription?.options?.params !== undefined)
            .map((sub) => ({
              id: sub.subscription.id,
              contractAddress: sub.subscription.options.params.address,
              lastBlock: sub.subscription.lastBlock,
            }));

          if (
            activeSubscriptionLoggingCounter === undefined ||
            activeSubscriptionLoggingCounter >=
              this.config.routineCallLoggingPeriod
          ) {
            this.logger.trace(
              `Active subscriptions: ${JSON.stringify(loggableSubscriptions)}`,
            );
            activeSubscriptionLoggingCounter = 1;
          } else {
            activeSubscriptionLoggingCounter++;
          }
        }
      }, this.config.subscriptionsLogIntervalInSeconds * 1000);
    }
  }

  private async computeGasPrice(): Promise<number> {
    const blockchainGasPrice = await this.web3.eth.getGasPrice();
    let gasPrice = Math.floor(
      Number(blockchainGasPrice) * this.config.gasPriceFactor,
    );

    gasPrice = Math.max(gasPrice, this.config.minGasPriceInGWei * ONE_BILLION);
    gasPrice = Math.min(gasPrice, this.config.maxGasPriceInGWei * ONE_BILLION);

    return gasPrice;
  }

  private async computeTransactionArguments(
    abstractTransaction: AbstractTransaction<unknown[], EthereumSpecificParams>,
  ): Promise<{
    from: string;
    nonce: number;
    gasPrice: number;
    to: string;
    value: string;
  }> {
    const gasPrice =
      abstractTransaction.blockchainSpecificParams?.gasPrice !== undefined
        ? abstractTransaction.blockchainSpecificParams?.gasPrice
        : await this.computeGasPrice();
    const signingAddress = await this.getAddress();
    const value =
      abstractTransaction.value !== undefined
        ? '0x' + abstractTransaction.value.toString(16)
        : '0x0';

    if (signingAddress === null || signingAddress === undefined) {
      throw new Error('Signer returned no signing address');
    }
    const nonce =
      abstractTransaction.nonce !== undefined
        ? abstractTransaction.nonce
        : await this.web3.eth.getTransactionCount(signingAddress, 'pending');

    return {
      from: signingAddress,
      nonce,
      gasPrice,
      to: abstractTransaction.to,
      value,
    };
  }

  private async estimateGas(
    abstractTransaction: AbstractTransaction<unknown[], EthereumSpecificParams>,
    web3Transaction: ContractSendMethod,
  ): Promise<number> {
    const { to } = abstractTransaction;

    const signingAddress = await this.getAddress();

    if (signingAddress === null || signingAddress === undefined) {
      throw new Error('Signer returned no signing address');
    }

    try {
      const gas = await web3Transaction.estimateGas({
        from: signingAddress,
        gas: 4000000,
      });
      return Math.ceil(gas * 1.3); // Magick value
    } catch (e) {
      this.logger.error(
        `EthContract[${to}] - Error while estimating gas : ${e}`,
      );

      throw e;
    }
  }

  private async doCallOnWeb3Transaction<T>(
    abstractTransaction: AbstractTransaction<unknown[], EthereumSpecificParams>,
    web3Transaction: ContractSendMethod,
    gas: number,
  ): Promise<CallResult<T>> {
    const { to } = abstractTransaction;

    const signingAddress = await this.getAddress();

    if (signingAddress === null || signingAddress === undefined) {
      throw new Error('Signer returned no signing address');
    }

    const callResult = (await web3Transaction.call(
      {
        from: signingAddress,
        gas,
      },
      (error, result) => {
        if (error) {
          this.logger.error(
            `EthContract[${to}] - Error during call : ${error}`,
          );
        }
        if (result) {
          this.logger.debug(
            `EthContract[${to}] - Call result : ${JSON.stringify(result)}`,
          );
        }
      },
    )) as unknown; // cast any to unknown

    // Very optimistic cast 🤞
    return callResult as CallResult<T>;
  }

  private async broadcast(
    abstractTransaction: AbstractTransaction<unknown[], EthereumSpecificParams>,
    signedTransaction: EthereumSignedTx,
  ): Promise<string> {
    const { to } = abstractTransaction;

    let transactionHash: string | null = null;

    const logEvent =
      (subject: string) =>
      (info: any): void =>
        this.logger.debug(
          `Event for subject[${subject}] txHash[${transactionHash}] : ${JSON.stringify(
            info,
          )}`,
        );

    let transactionHashPromiseResolver: {
      resolve: (txHash: string | PromiseLike<string>) => void;
      reject: (reason?: any) => void;
    };
    const transactionHashPromise = new Promise<string>((resolve, reject) => {
      transactionHashPromiseResolver = {
        resolve,
        reject,
      };
    });

    this.web3.eth
      .sendSignedTransaction(signedTransaction)
      .on('transactionHash', (hash: string) => {
        transactionHash = hash;
        transactionHashPromiseResolver.resolve(hash);
        logEvent('transactionHash')(`Transaction Hash has been received`);
      })
      .on('receipt', (receipt) => {
        parseReceiptEvents(
          abstractTransaction.blockchainSpecificParams?.abi,
          abstractTransaction.to,
          receipt,
        );
        logEvent('receipt')(receipt);
        if (
          transactionHash !== null &&
          this.currentTransactionInfos.has(transactionHash)
        ) {
          const transactionInfo = this.currentTransactionInfos.get(
            transactionHash,
          ) as TransactionInfo<
            EthereumSpecificTransactionInfo,
            EthereumSpecificParams
          >;
          transactionInfo.blockNumber = receipt.blockNumber;
          transactionInfo.status = TransactionStatus.CONFIRMED;
          transactionInfo.lastStatusTimestamp = new Date();
          delete transactionInfo.currentError;
          transactionInfo.emittedEvents =
            this.buildEventsFromTransactionReceipt(receipt);
          this.transactionObservable
            .get(transactionHash)
            ?.next(TransactionStatus.CONFIRMED);
          this.transactionObservable.get(transactionHash)?.complete();
        }
      })
      .on('confirmation', (confNumber: number) => {
        logEvent('confirmation')(confNumber);
      })
      // we don't need to listen to the error event, everything will be handled in the catch
      //.on('error', err => {})
      .catch((err: any) => {
        const errorMessage: string = errorAsString(err);
        this.logger.error(
          `Transaction broadcasting failed with error[${errorMessage}]`,
        );
        if (transactionHash === null) {
          // failed before we got transaction hash
          transactionHashPromiseResolver.reject(err);
        } else {
          if (this.currentTransactionInfos.has(transactionHash)) {
            const transactionInfo = this.currentTransactionInfos.get(
              transactionHash,
            ) as TransactionInfo<
              EthereumSpecificTransactionInfo,
              EthereumSpecificParams
            >;
            transactionInfo.status = TransactionStatus.REJECTED;
            transactionInfo.currentError = errorMessage;
            transactionInfo.lastStatusTimestamp = new Date();
            this.currentTransactionInfos.set(transactionHash, transactionInfo);
            this.transactionObservable
              .get(transactionHash)
              ?.next(TransactionStatus.REJECTED);
            this.transactionObservable.get(transactionHash)?.complete();
          }
        }
      });

    return transactionHashPromise;
  }

  private buildEventsFromTransactionReceipt(
    receipt: Web3TransactionReceipt,
  ): Event<string, unknown>[] {
    const events = receipt.events;
    if (events === undefined) {
      return [];
    }
    return Object.values(events).map((eventLog) => ({
      eventName: eventLog.event,
      blockNumber: eventLog.blockNumber,
      payload: eventLog.returnValues as unknown,
      transactionId: eventLog.transactionHash,
      blockHash: eventLog.blockHash,
      smartContractAddress: eventLog.address,
    }));
  }

  private getWeb3Instance(config: EthereumConfig): Web3 {
    this.logger.debug(`Connecting to blockchain with url[${this.nodeUrl}]`);
    const websocketProviderOptions: WebsocketProviderOptions = {
      timeout: 5000,
      reconnect: {
        auto: true,
        onTimeout: true,
        delay: 1000,
      },
    };
    const websocketProvider = new Web3.providers.WebsocketProvider(
      this.nodeUrl,
      websocketProviderOptions,
    );
    const web3 = new Web3(websocketProvider) as any;
    if (web3 && web3.currentProvider && web3.currentProvider.on) {
      web3.currentProvider.on('connect', () => {
        this.logger.debug(`Websocket is connected`);
        // current block header could be outdated(if reconnecting after disconnect), this will force reload
        this.currentBlockHeader = null;
      });
      web3.currentProvider.on('close', (event) => {
        this.logger.error(
          `Websocket closed : code[${event.code}] reason[${event.reason}] wasClean[${event.wasClean}]`,
        );
      });
      web3.currentProvider.on('reconnect', (attemptNumber) => {
        this.logger.warn(`Websocket reconnect attempt #${attemptNumber}`);
      });
      web3.currentProvider.on('error', (event) => {
        this.logger.error(`Websocket error : ${JSON.stringify(event)}`);
      });
    }

    if (web3) {
      this.logger.debug('Subscribing to new blocks');

      web3.eth
        .subscribe('newBlockHeaders')
        .on('data', async (data: BlockHeader) => {
          this.logger.debug(
            `Received new block with blockNumber[${data.number}] blockHash[${data.hash}]`,
          );
          this.currentBlockHeader = data;
          // set lastBlock in all subscriptions in case it is null
          if (this.web3 && (this.web3 as any)._requestManager) {
            const subscriptions = (this.web3 as any)._requestManager
              .subscriptions;

            [...subscriptions.values()]
              .filter((sub) => sub?.subscription?.options?.params !== undefined)
              .forEach((sub) => {
                if (sub.subscription.lastBlock === null) {
                  sub.subscription.lastBlock = data.number;
                }
              });
          }
        });
    }
    // get reasons of revert (especially require messages)
    web3.eth.handleRevert = true;
    // stop polling for confirmations once the transaction is considered confirmed
    web3.eth.transactionConfirmationBlocks = config.numberOfConfirmation;
    return web3;
  }

  public async getAddress(): Promise<string> {
    const pk = this.params.signer.getPublicKey();
    const address = addHexPrefix(bufferToHex(publicToAddress(toBuffer(pk))));
    return address;
  }

  public async getPublicKey(): Promise<string> {
    return this.params.signer.getPublicKey();
  }
}
