import { AbiItem } from 'web3-utils';

export class EthereumSpecificParams {
  abi?: AbiItem[] | AbiItem;
  gasPrice?: number;
  gasLimit?: number;
}
