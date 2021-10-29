import {
  Logger,
  TransactionId,
  TransactionInfo,
  TransactionInfoProvider,
  TransactionStatus,
} from '@castframework/types';
import {
  BlockResponse,
  OperationContentsTransaction,
  OperationEntry,
  OpKind,
} from '@taquito/rpc';
import { flatten } from 'lodash';
import { TezosSpecificParams } from '../..';
import { TezosBlockchainDriver } from '../../TezosBlockchainDriver';
import { TezosSpecificTransactionInfo } from '../../types/TezosSpecificTransactionInfo';

interface PendingOperations {
  applied: OperationEntry[];
  refused: [string, Partial<OperationEntry>][];
  branch_refused: [string, Partial<OperationEntry>][];
  branch_delayed: [string, Partial<OperationEntry>][];
  unprocessed: [string, Partial<OperationEntry>][];
}

export class TezosNodeTransactionInfoProvider
  implements TransactionInfoProvider<TezosBlockchainDriver>
{
  public constructor(
    private driver: TezosBlockchainDriver,
    private logger: Logger,
    private minBlockNumber: number,
    private maxLookbackBlockNumber: number,
  ) {}

  public async getTransactionInfo(
    transactionId: TransactionId,
  ): Promise<
    | TransactionInfo<TezosSpecificTransactionInfo, TezosSpecificParams>
    | undefined
  > {
    this.logger.trace(
      `TezosNodeTransactionInfoProvider.getTransactionInfo with transactionId[${transactionId}]`,
    );
    const pendingTransactionInfo = (
      await this.getPendingTransactionsInfo()
    ).get(transactionId);
    if (pendingTransactionInfo !== undefined) {
      this.logger.trace(
        `TezosNodeTransactionInfoProvider.getTransactionInfo with transactionId[${transactionId}]: external transaction found in mempool with info[${JSON.stringify(
          pendingTransactionInfo,
        )}]`,
      );
      return pendingTransactionInfo;
    }

    const currentBlock = (await this.driver.getLastBlock()).blockNumber;
    const minBlockNumber = Math.max(
      this.minBlockNumber,
      currentBlock - this.maxLookbackBlockNumber,
    );
    for (
      let blockNumber = currentBlock;
      blockNumber >= minBlockNumber;
      blockNumber--
    ) {
      const foundOperation = this.findTransactionInBlock(
        await this.driver.getBlock(blockNumber),
        transactionId,
      );
      if (foundOperation !== undefined) {
        const transactionInfo: TransactionInfo<
          TezosSpecificTransactionInfo,
          TezosSpecificParams
        > = {
          id: transactionId,
          nonce: this.getNonce(foundOperation),
          status: TransactionStatus.CONFIRMED,
          lastStatusTimestamp: new Date(),
          blockNumber,
        };
        this.logger.trace(
          `TezosNodeTransactionInfoProvider.getTransactionInfo with transactionId[${transactionId}]: external transaction found in blockchain with info[${JSON.stringify(
            foundOperation,
          )}]`,
        );
        return transactionInfo;
      }
      this.logger.trace(
        `TezosNodeTransactionInfoProvider.getTransactionInfo with transactionId[${transactionId}]: transaction not found in block ${blockNumber}`,
      );
    }
    return undefined;
  }

  private findTransactionInBlock(
    block: BlockResponse,
    transactionId: TransactionId,
  ): OperationEntry | undefined {
    return flatten(block.operations).find(
      (operation) => operation.hash === transactionId,
    );
  }

  private async getPendingTransactionsInfo(): Promise<
    Map<
      TransactionId,
      TransactionInfo<TezosSpecificTransactionInfo, TezosSpecificParams>
    >
  > {
    const result = new Map<
      TransactionId,
      TransactionInfo<TezosSpecificTransactionInfo, TezosSpecificParams>
    >();
    const response = await fetch(
      `${this.driver.getNodeUrl()}/chains/main/mempool/pending_operations`,
    );
    const pendingOperations: PendingOperations = await response.json();
    pendingOperations.applied.forEach((operation) =>
      result.set(operation.hash, {
        id: operation.hash,
        nonce: this.getNonce(operation),
        status: TransactionStatus.PENDING,
        lastStatusTimestamp: new Date(),
      }),
    );
    pendingOperations.branch_delayed.forEach((array) =>
      result.set(array[0], {
        id: array[0],
        nonce: this.getNonce(array[1]),
        status: TransactionStatus.PENDING,
        lastStatusTimestamp: new Date(),
      }),
    );
    pendingOperations.refused.forEach((array) =>
      result.set(array[0], {
        id: array[0],
        nonce: this.getNonce(array[1]),
        status: TransactionStatus.REJECTED,
        lastStatusTimestamp: new Date(),
      }),
    );
    pendingOperations.branch_refused.forEach((array) =>
      result.set(array[0], {
        id: array[0],
        nonce: this.getNonce(array[1]),
        status: TransactionStatus.REJECTED,
        lastStatusTimestamp: new Date(),
      }),
    );
    return result;
  }

  private getNonce(operation: Partial<OperationEntry>): number {
    if (
      operation.contents !== undefined &&
      operation.contents[0] !== undefined &&
      operation.contents[0].kind === OpKind.TRANSACTION
    ) {
      return parseInt(
        (operation.contents[0] as OperationContentsTransaction).counter,
      );
    }
    return -1;
  }
}
