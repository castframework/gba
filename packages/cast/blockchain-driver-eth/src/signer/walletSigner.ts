import { EthereumSignedTx, EthereumTx } from '../types';
import { Signer } from '@castframework/types';
import {
  addHexPrefix,
  bufferToHex,
  privateToAddress,
  toBuffer,
} from 'ethereumjs-util';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Accounts = require('web3-eth-accounts');

export class PrivateKeySigner implements Signer<EthereumTx, EthereumSignedTx> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  accountBase = new Accounts();

  constructor(private readonly privateKey: string) {}

  public async sign(transaction: EthereumTx): Promise<EthereumSignedTx> {
    const account = this.accountBase.privateKeyToAccount(this.privateKey);

    try {
      const signature = await account.signTransaction(transaction);
      if (!signature.rawTransaction) {
        throw new Error('Error while signing the transaction');
      }
      return signature.rawTransaction;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public getPublicKey(): string {
    return addHexPrefix(
      bufferToHex(privateToAddress(toBuffer(this.privateKey))),
    );
  }
}
