import {
  Logger,
  TransactionId,
  TransactionInfo,
  TransactionInfoProvider,
  TransactionStatus,
} from '@castframework/types';
import { EthereumSpecificParams } from '../..';
import { EthereumBlockchainDriver } from '../../EthereumBlockchainDriver';
import { EthereumSpecificTransactionInfo } from '../../types/EthereumSpecificTransactionInfo';

export class EthereumNodeTransactionInfoProvider
  implements TransactionInfoProvider<EthereumBlockchainDriver>
{
  public constructor(
    private driver: EthereumBlockchainDriver,
    private logger: Logger,
  ) {}

  public async getTransactionInfo(
    transactionId: TransactionId,
  ): Promise<
    | TransactionInfo<EthereumSpecificTransactionInfo, EthereumSpecificParams>
    | undefined
  > {
    const transaction = await this.driver
      .getWeb3()
      .eth.getTransaction(transactionId);

    // unknown transaction
    if (transaction === null) {
      this.logger.trace(
        `EthereumNodeTransactionInfoProvider.getTransactionInfo with transactionId[${transactionId}]: external transaction not found in the blockchain`,
      );
      return undefined;
    }
    // pending transaction
    if (transaction.blockNumber === null) {
      const transactionInfo: TransactionInfo<
        EthereumSpecificTransactionInfo,
        EthereumSpecificParams
      > = {
        id: transactionId,
        nonce: transaction.nonce,
        status: TransactionStatus.PENDING,
        lastStatusTimestamp: new Date(),
        blockchainSpecificTransactionInfo: {
          gasPrice: Number.parseInt(transaction.gasPrice),
          gasLimit: transaction.gas,
        },
      };
      this.logger.trace(
        `EthereumNodeTransactionInfoProvider.getTransactionInfo with transactionId[${transactionId}]: external transaction found with info[${JSON.stringify(
          transactionInfo,
        )}]`,
      );
      return transactionInfo;
    }
    // transaction is included in the blockchain
    const transactionInfo: TransactionInfo<
      EthereumSpecificTransactionInfo,
      EthereumSpecificParams
    > = {
      id: transactionId,
      nonce: transaction.nonce,
      status: TransactionStatus.CONFIRMED,
      lastStatusTimestamp: new Date(),
      blockNumber: transaction.blockNumber,
      blockchainSpecificTransactionInfo: {
        gasPrice: Number.parseInt(transaction.gasPrice),
        gasLimit: transaction.gas,
      },
    };
    this.logger.trace(
      `EthereumNodeTransactionInfoProvider.getTransactionInfo with transactionId[${transactionId}]: external transaction found with info[${JSON.stringify(
        transactionInfo,
      )}]`,
    );
    return transactionInfo;
  }
}
