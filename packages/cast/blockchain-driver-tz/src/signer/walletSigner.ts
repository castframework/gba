import { TezosSignedTx, TezosTx } from '../types';
import { Signer } from '@castframework/types';
import { InMemorySigner } from '@taquito/signer';
import { extractPublicKeyFromSecret } from '../utils';

export class PrivateKeySigner implements Signer<TezosTx, TezosSignedTx> {
  private readonly inMemorySigner: InMemorySigner;

  constructor(private readonly privateKey: string) {
    this.inMemorySigner = new InMemorySigner(this.privateKey);
  }

  public async sign(transaction: TezosTx): Promise<TezosSignedTx> {
    return this.inMemorySigner.sign(
      transaction.op as string,
      transaction.magicByte,
    );
  }

  public getPublicKey(): string {
    return extractPublicKeyFromSecret(this.privateKey);
  }

  public getSecret(): string {
    return this.privateKey;
  }
}
