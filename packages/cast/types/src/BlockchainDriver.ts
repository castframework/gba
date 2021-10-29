import { Observable } from 'rxjs';
import { Logger } from './Logger';

export interface TransactionParams {
  previousTransactions?: string[];
}
export interface AbstractTransaction<
  MethodParametersType extends unknown[] = unknown[],
  BlockchainSpecificParams = Record<string, never>,
> {
  to: string;
  methodName?: string;
  methodParameters?: MethodParametersType;
  nonce?: number;
  blockchainSpecificParams?: Partial<BlockchainSpecificParams>;
  transactionParams?: TransactionParams;
  replacedTransactionId?: TransactionId;
  value?: number;
}
export interface ListenParams<BlockchainSpecificListenParams> {
  smartContractAddress: string;
  eventName: string;
  from?: number;
  blockchainSpecificParams?: Partial<BlockchainSpecificListenParams>;
}

export interface TransactionReceipt {
  transactionId: TransactionId;
}

// state transitions
// PENDING -> REJECTED when tx is rejected by the node
// PENDING -> CONFIRMED when tx is added to the blockchain
// PENDING -> CANCELLED when tx is replaced with another tx(state changes to CANCELLED when replacement tx moves to CONFIRMED)
export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export function isFinal(status: TransactionStatus): boolean {
  return [
    TransactionStatus.CONFIRMED,
    TransactionStatus.REJECTED,
    TransactionStatus.CANCELLED,
  ].includes(status);
}

export class TransactionInfo<
  BlockchainSpecificTransactionInfo,
  BlockchainSpecificParams,
> {
  id: TransactionId;
  nonce: number;
  status: TransactionStatus;
  lastStatusTimestamp: Date;
  blockNumber?: number;
  sendTimestamp?: Date;
  sendBlockNumber?: number;
  blockchainSpecificTransactionInfo?: Partial<BlockchainSpecificTransactionInfo>;
  replacementTransactionId?: TransactionId;
  replacedTransactionId?: TransactionId;
  details?: AbstractTransaction<unknown[], BlockchainSpecificParams>;
  currentError?: string;
  emittedEvents?: Event<string, unknown>[];
}

// todo: renommer ExternalTransactionInfoProvider ?
export interface TransactionInfoProvider<
  Driver extends BlockchainDriver<unknown, unknown>,
> {
  getTransactionInfo(
    transactionId: TransactionId,
  ): Promise<
    | TransactionInfo<
        BlockchainSpecificTransactionInfoOf<Driver>,
        BlockchainSpecificParamsOf<Driver>
      >
    | undefined
  >;
}

export interface TransactionInfoProviderFactory<
  Driver extends BlockchainDriver<unknown, unknown>,
> {
  getTransactionProvider(
    driver: Driver,
    logger: Logger,
  ): TransactionInfoProvider<Driver>;
}

export interface BlockInfo {
  blockNumber: number;
  blockHash: string;
}

export enum BlockchainDriverStatus {
  NOT_READY = 'NOT_READY',
  READY = 'READY',
  ERROR = 'ERROR',
  CLOSED = 'CLOSED',
}

export type CancelReceipt = TransactionReceipt;
export type CallResult<CallReturnType = unknown> = CallReturnType;
export type Event<EventName extends string, PayloadType = unknown> = {
  eventName: EventName extends 'allEvents' ? string : EventName;
  smartContractAddress: string;
  blockNumber: number;
  blockHash: string;
  transactionId: string;
  payload: PayloadType;
};

export type TransactionId = string;

export interface Signer<TxType, SignedTxType> {
  sign: (transaction: TxType) => Promise<SignedTxType>;
  getPublicKey(): string;
}

export interface BlockchainDriverParams<TxType, SignedTxType, ConfigType> {
  signer: Signer<TxType, SignedTxType>;
  nodeURL: string;
  config: ConfigType;
}

export type BlockchainSpecificParamsOf<Driver> =
  Driver extends BlockchainDriver<infer BlockchainSpecificParams, unknown>
    ? BlockchainSpecificParams
    : never;

export type BlockchainSpecificTransactionInfoOf<Driver> =
  Driver extends BlockchainDriver<
    unknown,
    infer BlockchainSpecificTransactionInfo
  >
    ? BlockchainSpecificTransactionInfo
    : never;

export class RetriableError {
  constructor(private error: any) {}
}

export interface BlockchainDriver<
  BlockchainSpecificParams,
  BlockchainSpecificTransactionInfo,
> {
  //new(params: BlockchainDriverParams<TxType, SignedTxType, ConfigType>);
  initialize(): Promise<void>;
  setLogger(logger: Logger): void;
  send<MethodParametersType extends unknown[]>(
    abstractTransaction: AbstractTransaction<
      MethodParametersType,
      BlockchainSpecificParams
    >,
  ): Promise<TransactionReceipt>;
  cancelTransaction(
    transactionId: TransactionId,
    blockchainSpecificParams?: BlockchainSpecificParams,
  ): Promise<TransactionReceipt>;
  boostTransaction(
    transactionId: TransactionId,
    blockchainSpecificParams?: BlockchainSpecificParams,
  ): Promise<TransactionReceipt>;
  listen<EventType extends Event<string>>(
    params: ListenParams<BlockchainSpecificParams>,
  ): Observable<EventType>;
  getTransactionInfo(
    transactionId: TransactionId,
  ): Promise<
    TransactionInfo<BlockchainSpecificTransactionInfo, BlockchainSpecificParams>
  >;
  getTransactionsInfo(): Promise<
    TransactionInfo<
      BlockchainSpecificTransactionInfo,
      BlockchainSpecificParams
    >[]
  >;
  waitForConfirmation(transactionId: TransactionId): Promise<void>;
  getLastBlock(): Promise<BlockInfo>;
  call<MethodParametersType extends unknown[], CallReturnType>(
    abstractCall: AbstractTransaction<
      MethodParametersType,
      BlockchainSpecificParams
    >,
  ): Promise<CallResult<CallReturnType>>;
  close(): Promise<void>;
}
