import { AbiItem } from 'web3-utils';

export class EthereumSpecificParams {
  abi?: AbiItem[] | AbiItem;
  gasPrice?: number;
  gasLimit?: number;
  maxPriorityFeePerGas?: number;
  maxFeePerGas?: number;
  baseFeePerGas?: number;
  type?: string;
}
