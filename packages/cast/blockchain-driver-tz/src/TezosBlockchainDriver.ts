import {
  AbstractTransaction,
  BlockchainDriver,
  BlockchainDriverParams,
  BlockInfo,
  CallResult,
  CancelReceipt,
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
import {
  concat,
  EMPTY,
  from,
  Observable,
  of,
  range,
  ReplaySubject,
  Subject,
  timer,
} from 'rxjs';
import {
  EventMappers,
  TezosConfig,
  TezosSignedTx,
  TezosSpecificParams,
  TezosSpecificTransactionInfo,
  TezosTx,
} from './types';
import { defaultConfig } from './defaultConfig';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import {
  ContractAbstraction,
  ContractProvider,
  PollingSubscribeProvider,
  SetProviderOptions,
  TezosOperationError,
  TezosToolkit,
  TransactionOperation,
} from '@taquito/taquito';
import { BlockResponse, OperationEntry } from '@taquito/rpc';
import { HttpResponseError, STATUS_CODE } from '@taquito/http-utils';
import { extractAddressFromPublicKey } from './utils';
import { SignerToTaquitoSigner } from './signer';
import { waitFor } from './utils/promiseUtils';
import { errorAsString, getTezosErrorMessage } from './utils/errorAsString';
import { trashBinLogger } from '@castframework/utils';
import * as R from 'ramda';
import {
  formatEvent,
  getAllContentsAddOpHash,
  getAllInternalOperationAddOpHash,
  takeEvent,
  takeOperationContentToAddressWithInternalOp,
} from './rpcParser';

export { Logger } from 'log4js';

export class TezosBlockchainDriver
  implements
    BlockchainDriver<TezosSpecificParams, TezosSpecificTransactionInfo>
{
  // TODO : populate with corresponding taquito error messages
  private static NONCE_ERRORS = ['already used for contract'];
  private static COUNTER_ERRORS_ID = [
    // should we use the full id with the proto ?
    '.counter_in_the_future',
    '.counter_in_the_past',
    '.tx_rollup_counter_overflow',
    '.tx_rollup_operation_counter_mismatch',
    '.tx_rollup_unknown_address_index',
  ];
  private static CONNECTION_ERRORS = [];
  private static HTTP_ERRORS_CODE: STATUS_CODE[] = [
    504, 500, 507, 508, 408, 503, 429,
  ];

  private logger: Logger = trashBinLogger;
  private tezosToolkit: TezosToolkit;
  private nodeUrl: string;
  private config: Required<TezosConfig>;
  private latestLevel?: number;
  private newBlocks$: Observable<BlockResponse>;
  private lastBlock: BlockResponse;
  private close$: Subject<void> = new Subject();
  private transactionInfoProvider: TransactionInfoProvider<TezosBlockchainDriver>;
  private currentTransactionInfos: Map<
    TransactionId,
    TransactionInfo<TezosSpecificTransactionInfo, TezosSpecificParams>
  >;
  private transactionObservable: Map<
    TransactionId,
    ReplaySubject<TransactionStatus>
  >;

  constructor(
    private readonly params: BlockchainDriverParams<
      TezosTx,
      TezosSignedTx,
      TezosConfig
    >,
  ) {
    this.nodeUrl = this.params.nodeURL;
    this.config = {
      ...defaultConfig,
      ...this.params.config,
    };
    this.currentTransactionInfos = new Map<
      string,
      TransactionInfo<TezosSpecificTransactionInfo, TezosSpecificParams>
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
    this.tezosToolkit = this.getTezosToolkit(this.config);
    const newBlocks$ = this.listenNewBlocks().pipe(takeUntil(this.close$));
    this.logger.debug('Subscribing to new blocks');
    newBlocks$.subscribe((lastBlock) => {
      this.logger.debug(
        `Received new block with blockNumber[${lastBlock.header.level}] blockHash[${lastBlock.hash}]`,
      );
      this.lastBlock = lastBlock;
    });

    this.newBlocks$ = newBlocks$;

    this.transactionInfoProvider =
      this.config.transactionInfoProviderFactory.getTransactionProvider(
        this,
        this.logger,
      );

    this.logger.trace('Finished initialization');
  }

  public getNodeUrl(): string {
    return this.nodeUrl;
  }

  public async boostTransaction(
    transactionId: TransactionId,
    blockchainSpecificParams?: TezosSpecificParams,
  ): Promise<TransactionReceipt> {
    if (!this.tezosToolkit) {
      await this.initialize();
    }
    // not possible on tezos :'(
    // https://gitlab.com/tezos/tezos/-/issues/644
    // https://github.com/ecadlabs/taquito/issues/213
    throw new Error('Boosting transactions is not possible on Tezos right now');
  }

  public async cancelTransaction(
    transactionId: TransactionId,
    blockchainSpecificParams?: TezosSpecificParams,
  ): Promise<CancelReceipt> {
    if (!this.tezosToolkit) {
      await this.initialize();
    }
    // not possible on tezos :'(
    // https://gitlab.com/tezos/tezos/-/issues/644
    // https://github.com/ecadlabs/taquito/issues/213
    throw new Error(
      'Cancelling transactions is not possible on Tezos right now',
    );
  }

  public async call<MethodParametersType extends unknown[], CallResultType>(
    abstractCall: AbstractTransaction<
      MethodParametersType,
      TezosSpecificParams
    >,
  ): Promise<CallResult<CallResultType>> {
    if (!this.tezosToolkit) {
      await this.initialize();
    }
    const {
      to,
      methodName,
      methodParameters = [],
      blockchainSpecificParams,
    } = abstractCall;

    this.logger.trace(`Call with params ${JSON.stringify(abstractCall)}`);

    if (methodName === undefined) {
      throw new Error(`call can only handle smart contract calls`);
    }

    const taquitoContract = await this.tezosToolkit.contract.at(to);

    if (
      blockchainSpecificParams?.viewMappers?.[methodName] === undefined ||
      blockchainSpecificParams?.viewMappers?.[methodName] === null
    ) {
      throw new Error(`No view mapper for method ${abstractCall.methodName}`);
    }

    const storage = await taquitoContract.storage();

    this.logger.trace(
      `Calling view mapper for ${methodName} with args ${JSON.stringify({
        methodsParameters: methodParameters,
        storage: storage,
      })}`,
    );

    const result = (await (blockchainSpecificParams?.viewMappers[methodName](
      storage,
      methodParameters,
    ) as unknown)) as CallResult<CallResultType>;

    this.logger.trace(
      `Calling view mapper for ${methodName} returned ${JSON.stringify(
        result,
      )}`,
    );

    return result;
  }

  public async getLastBlock(): Promise<BlockInfo> {
    if (!this.tezosToolkit) {
      await this.initialize();
    }
    if (this.lastBlock === undefined || this.lastBlock === null) {
      this.lastBlock = await this.tezosToolkit.rpc.getBlock();
    }
    return {
      blockNumber: this.lastBlock.header.level,
      blockHash: this.lastBlock.hash,
    };
  }

  public async waitForConfirmation(
    transactionId: TransactionId,
  ): Promise<void> {
    if (!this.tezosToolkit) {
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
              throw new Error(`Transaction rejected`);
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
        return transactionInfo.status === TransactionStatus.CONFIRMED;
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
    TransactionInfo<TezosSpecificTransactionInfo, TezosSpecificParams>
  > {
    if (!this.tezosToolkit) {
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
    TransactionInfo<TezosSpecificTransactionInfo, TezosSpecificParams>[]
  > {
    if (!this.tezosToolkit) {
      await this.initialize();
    }
    return [...this.currentTransactionInfos.values()];
  }

  public async getBlock(level?: number): Promise<BlockResponse> {
    if (level === undefined) {
      return this.tezosToolkit.rpc.getBlock();
    }
    return this.tezosToolkit.rpc.getBlock({ block: level.toString() });
  }

  public listen<EventType extends Event<string>>(
    params: ListenParams<TezosSpecificParams>,
  ): Observable<EventType> {
    this.logger.trace(`Listen with params ${JSON.stringify(params)}`);

    const initializeTezosToolKit = switchMap((tezosToolkit) => {
      if (tezosToolkit === undefined) {
        return from(this.initialize()).pipe(
          switchMap(() => of(this.tezosToolkit)),
        );
      }
      return of(this.tezosToolkit);
    });

    return of(this.tezosToolkit).pipe(
      initializeTezosToolKit,
      switchMap(() => this._listen<EventType>(params)),
    );
  }

  private getEventMappersOrThrow(
    blockchainSpecificParams?: Partial<TezosSpecificParams>,
  ): EventMappers {
    const eventMappers = blockchainSpecificParams?.eventMappers;

    if (eventMappers === undefined) {
      this.logger.error('You must have event mappers to use listen');
      throw new Error('You must have event mappers to use listen');
    }

    return eventMappers;
  }

  private logListeningParams(params: ListenParams<TezosSpecificParams>): void {
    this.logger.debug(
      `Listening to event ${params.eventName} from block ${
        params.from ?? 'latest'
      } for smart contract ${
        params.smartContractAddress
      } with Tezos Specific params ${JSON.stringify(
        params.blockchainSpecificParams,
      )}`,
    );
  }

  private _listen<EventType extends Event<string>>(
    params: ListenParams<TezosSpecificParams>,
  ): Observable<EventType> {
    const {
      from: fromBlock,
      smartContractAddress,
      eventName,
      blockchainSpecificParams,
    } = params;

    const eventMappers = this.getEventMappersOrThrow(blockchainSpecificParams);

    this.logListeningParams(params);

    return this.blocksFrom(fromBlock).pipe(
      switchMap((block) =>
        from(
          this.blockToEvents<EventType>(
            block,
            smartContractAddress,
            eventName,
            eventMappers,
          ),
        ),
      ),
    );
  }

  private blocksFrom(fromLevel?: number): Observable<BlockResponse> {
    if (fromLevel === undefined) {
      return this.newBlocks$;
    }

    const latestLevel$ =
      this.latestLevel !== undefined
        ? of(this.latestLevel)
        : from(this.getLastBlock()).pipe(
            map((lastBlock) => lastBlock.blockNumber),
          );

    const blocksFromLevel$ = latestLevel$.pipe(
      switchMap((lastLevel) =>
        range(fromLevel, Math.max(lastLevel - fromLevel, 1)),
      ),
      switchMap((wantedBlockLevel) => this.getBlock(wantedBlockLevel)),
    );

    // TODO #1580: This method is missing blocks between the end of blocksFromLevel$ and the first from newBlocks$
    return concat(blocksFromLevel$, this.newBlocks$);
  }

  private logWarnAndForget = (error: Error): Observable<never> => {
    this.logger.warn(
      `Warning fail to get last block : ${errorAsString(error)}`,
    );
    return EMPTY;
  };

  private compareHeaderLevel = (x: BlockResponse, y: BlockResponse): boolean =>
    x.header.level === y.header.level;

  private getBlockAsObservable = (): Observable<BlockResponse> =>
    from(this.getBlock()).pipe(catchError(this.logWarnAndForget));

  private assertPollingInterval(): void {
    if (this.config.pollingIntervalInSeconds === 0) {
      throw new Error('Polling interval should not be 0');
    }
  }

  private listenNewBlocks(): Observable<BlockResponse> {
    this.assertPollingInterval();

    this.logger.trace(
      `Start polling with ${this.config.pollingIntervalInSeconds} seconds interval`,
    );

    return timer(0, this.config.pollingIntervalInSeconds * 1000).pipe(
      switchMap(this.getBlockAsObservable),
      distinctUntilChanged(this.compareHeaderLevel),
    );
  }

  private blockToEvents<EventType extends Event<string>>(
    block: BlockResponse,
    smartContractAddress: string,
    eventNameFilter: EventType['eventName'],
    eventMappers: EventMappers,
    specificOperationHash?: string,
  ): EventType[] {
    const blockNumber = block.header.level;
    const blockHash = block.hash;

    this.logger.trace(
      `Handling block [${blockNumber}:${blockHash}] for [${smartContractAddress}:${eventNameFilter}]`,
    );

    const specificOpHashFilter = R.filter(
      (operation: OperationEntry) =>
        specificOperationHash === undefined ||
        operation.hash === specificOperationHash,
    );

    const events = R.pipe(
      R.flatten as (any) => OperationEntry[],
      specificOpHashFilter,
      getAllContentsAddOpHash,
      takeOperationContentToAddressWithInternalOp(smartContractAddress),
      getAllInternalOperationAddOpHash,
      takeEvent(smartContractAddress, eventNameFilter),
      formatEvent(smartContractAddress, blockNumber, blockHash, eventMappers),
    )(block.operations);

    if (events) {
      this.logger.trace(
        `For Event [${eventNameFilter}] In block [${blockNumber}:${blockHash}] found : ${JSON.stringify(
          events,
        )}`,
      );
    }

    return events as EventType[];
  }

  public async send<MethodParametersType extends unknown[]>(
    abstractTransaction: AbstractTransaction<
      MethodParametersType,
      TezosSpecificParams
    >,
  ): Promise<TransactionReceipt> {
    try {
      if (!this.tezosToolkit) {
        await this.initialize();
      }
      const { to, methodName, methodParameters, transactionParams } =
        abstractTransaction;

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

      let transactionOperation: TransactionOperation;
      let taquitoContract: ContractAbstraction<ContractProvider>;
      // smart contract call
      if (methodName !== undefined && methodParameters !== undefined) {
        const smartContractAddress = to;
        // check that contract exists
        try {
          await this.tezosToolkit.rpc.getScript(smartContractAddress);
        } catch (error) {
          this.logger.debug(
            `Error getting script for address[${smartContractAddress}] : error[${errorAsString(
              error,
            )}]`,
          );
          throw new Error(`No contract at address ${smartContractAddress}`);
        }

        taquitoContract = await this.tezosToolkit.contract.at(
          smartContractAddress,
        );

        if (taquitoContract.methods[methodName] === undefined) {
          this.logger.error(
            `[TezosAdapter][${taquitoContract.address}] - callMethod[${methodName}] - Method ${methodName} does not exist on taquitoContract`,
          );
          throw new Error(
            `Contract at address ${taquitoContract.address} does not have a method named ${methodName}`,
          );
        }

        const contractSignature =
          taquitoContract.methodsObject[methodName]().getSignature();
        const tezosParameters = this.buildTezosParameters(
          methodParameters,
          contractSignature,
        );
        this.logger.trace(
          `Send with tezos parameters ${JSON.stringify(tezosParameters)}`,
        );
        const contractMethod =
          taquitoContract.methodsObject[methodName](tezosParameters); // Better unknown than any

        try {
          transactionOperation = await contractMethod.send();
        } catch (error) {
          this.logger.error(
            `Error creating blockchain transaction: ${getTezosErrorMessage(
              error,
            )}`,
          );
          throw new Error(error.message);
        }
      } else {
        transactionOperation = await this.tezosToolkit.contract.transfer({
          amount: abstractTransaction.value ?? 0,
          to: abstractTransaction.to,
        });
      }

      this.transactionObservable.set(
        transactionOperation.hash,
        new ReplaySubject<TransactionStatus>(1),
      );
      const transactionInfo: TransactionInfo<
        TezosSpecificTransactionInfo,
        TezosSpecificParams
      > = {
        id: transactionOperation.hash,
        nonce: parseInt(transactionOperation.operationResults[0].counter),
        status: TransactionStatus.PENDING,
        lastStatusTimestamp: new Date(),
        sendBlockNumber: (await this.getLastBlock()).blockNumber,
        sendTimestamp: new Date(),
        details: abstractTransaction,
      };
      this.currentTransactionInfos.set(
        transactionOperation.hash,
        transactionInfo,
      );
      this.transactionObservable
        .get(transactionOperation.hash)
        ?.next(TransactionStatus.PENDING);
      this.logger.debug(
        `Blockchain transaction sent successfully with txHash[${transactionOperation.hash}]`,
      );

      transactionOperation
        .confirmation()
        .then(async (blockNumber) => {
          this.logger.debug(
            `Blockchain transaction with txHash[${transactionOperation.hash}] confirmed with blockNumber[${blockNumber}]`,
          );
          const transactionInfo = this.currentTransactionInfos.get(
            transactionOperation.hash,
          ) as TransactionInfo<
            TezosSpecificTransactionInfo,
            TezosSpecificParams
          >;
          transactionInfo.blockNumber = blockNumber;
          transactionInfo.status = TransactionStatus.CONFIRMED;
          transactionInfo.lastStatusTimestamp = new Date();
          delete transactionInfo.currentError;
          // retrieve events only for smart contract calls
          if (taquitoContract !== undefined) {
            const currentBlock = await this.getBlock(blockNumber);
            const eventMappers =
              abstractTransaction.blockchainSpecificParams?.eventMappers;
            transactionInfo.emittedEvents =
              eventMappers !== undefined
                ? this.blockToEvents(
                    currentBlock,
                    abstractTransaction.to,
                    'allEvents',
                    eventMappers,
                    transactionOperation.hash,
                  )
                : [];
          }
          this.transactionObservable
            .get(transactionOperation.hash)
            ?.next(TransactionStatus.CONFIRMED);
          this.transactionObservable.get(transactionOperation.hash)?.complete();
        })
        .catch((reason) => {
          const errorMessage = errorAsString(reason);
          this.logger.debug(
            `Blockchain transaction failed with reason[${errorMessage}]`,
          );
          const transactionInfo = this.currentTransactionInfos.get(
            transactionOperation.hash,
          ) as TransactionInfo<
            TezosSpecificTransactionInfo,
            TezosSpecificParams
          >;
          transactionInfo.status = TransactionStatus.REJECTED;
          transactionInfo.lastStatusTimestamp = new Date();
          transactionInfo.currentError = errorMessage;
          this.transactionObservable
            .get(transactionOperation.hash)
            ?.next(TransactionStatus.REJECTED);
          this.transactionObservable.get(transactionOperation.hash)?.complete();
        });

      return {
        transactionId: transactionOperation.hash,
      };
    } catch (error) {
      if (this.isRetriable(error)) {
        throw new RetriableError(error);
      } else {
        this.logger.error(`Not retriable error:${JSON.stringify(error)}`);
        throw error;
      }
    }
  }

  private isRetriable(error: any): boolean {
    // Maybe we can only check the kind ?
    // temporary seem pretty 'retryable'like
    return (
      error instanceof Error &&
      (this.isNonceIssue(error) || this.isConnectionIssue(error))
    );
  }

  private isNonceIssue(error: Error): boolean {
    if (error instanceof TezosOperationError) {
      const tezosErrorId = error.id;

      return TezosBlockchainDriver.COUNTER_ERRORS_ID.some((id) =>
        tezosErrorId.includes(id),
      );
    }

    return TezosBlockchainDriver.NONCE_ERRORS.some((message) =>
      error.message.includes(message),
    );
  }

  private isConnectionIssue(error: Error): boolean {
    if (error instanceof HttpResponseError) {
      return TezosBlockchainDriver.HTTP_ERRORS_CODE.includes(error.status);
    }
    return TezosBlockchainDriver.CONNECTION_ERRORS.some((message) =>
      error.message.includes(message),
    );
  }

  private buildTezosParameters(
    methodParameters: any[],
    methodSignature: { [key: string]: any },
  ): any {
    const signatureKeys = Object.keys(methodSignature);

    if (methodParameters.length === 1) {
      return methodParameters[0];
    } else {
      return signatureKeys.reduce((acc, key, index) => {
        return {
          ...acc,
          [key]: methodParameters[index],
        };
      }, {});
    }
  }

  public async close(): Promise<void> {
    this.close$.next();
    this.logger.debug('Closing connection');
  }

  private getTezosToolkit(config: TezosConfig): TezosToolkit {
    this.logger.debug(`Connecting to blockchain with url[${this.nodeUrl}]`);

    const tezosToolkit = new TezosToolkit(this.nodeUrl);

    const taquitoConfig: SetProviderOptions['config'] = {
      confirmationPollingTimeoutSecond: config.confirmationPollingTimeoutSecond,
      defaultConfirmationCount: config.defaultConfirmationCount,
    };

    tezosToolkit.setProvider({
      rpc: this.nodeUrl,
      config: taquitoConfig,
      signer: new SignerToTaquitoSigner(this.params.signer),
    });

    tezosToolkit.setStreamProvider(
      tezosToolkit.getFactory(PollingSubscribeProvider)({
        pollingIntervalMilliseconds: config.pollingIntervalInSeconds * 1000,
        shouldObservableSubscriptionRetry:
          config.shouldObservableSubscriptionRetry,
        observableSubscriptionRetryFunction:
          config.observableSubscriptionRetryFunction,
      }),
    );

    return tezosToolkit;
  }

  public async getAddress(): Promise<string> {
    const pk = await this.params.signer.getPublicKey();
    const address = extractAddressFromPublicKey(pk);
    return address;
  }

  public async getPublicKey(): Promise<string> {
    return this.params.signer.getPublicKey();
  }
}
