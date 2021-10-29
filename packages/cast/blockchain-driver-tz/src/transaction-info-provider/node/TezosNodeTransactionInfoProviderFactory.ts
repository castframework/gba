import {
  Logger,
  TransactionInfoProvider,
  TransactionInfoProviderFactory,
} from '@castframework/types';
import { TezosBlockchainDriver } from '../../TezosBlockchainDriver';
import { TezosNodeTransactionInfoProvider } from './TezosNodeTransactionInfoProvider';

export class TezosNodeTransactionInfoProviderFactory
  implements TransactionInfoProviderFactory<TezosBlockchainDriver>
{
  public constructor(
    private minBlockNumber: number,
    private maxLookbackBlockNumber: number,
  ) {}

  public getTransactionProvider(
    driver: TezosBlockchainDriver,
    logger: Logger,
  ): TransactionInfoProvider<TezosBlockchainDriver> {
    return new TezosNodeTransactionInfoProvider(
      driver,
      logger,
      this.minBlockNumber,
      this.maxLookbackBlockNumber,
    );
  }
}
