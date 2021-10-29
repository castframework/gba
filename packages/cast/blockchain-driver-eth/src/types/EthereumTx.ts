export type EthereumTx = {
  nonce?: number;
  chainId?: number;
  from?: string;
  to?: string;
  data?: string;
  value?: string | number;
  gas?: number;
  gasPrice?: number;
};
