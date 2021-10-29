import {
  Logger,
  TransactionInfoProvider,
  TransactionInfoProviderFactory,
} from '@castframework/types';
import { EthereumBlockchainDriver } from '../../EthereumBlockchainDriver';
import { EthereumNodeTransactionInfoProvider } from './EthereumNodeTransactionInfoProvider';

export class EthereumNodeTransactionInfoProviderFactory
  implements TransactionInfoProviderFactory<EthereumBlockchainDriver>
{
  public getTransactionProvider(
    driver: EthereumBlockchainDriver,
    logger: Logger,
  ): TransactionInfoProvider<EthereumBlockchainDriver> {
    return new EthereumNodeTransactionInfoProvider(driver, logger);
  }
}
