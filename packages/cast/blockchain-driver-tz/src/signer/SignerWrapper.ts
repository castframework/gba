import { Signer as CastSigner } from '@castframework/types';
import { Signer } from '@taquito/taquito';
import { TezosSignedTx, TezosTx } from '../types';
import { extractAddressFromPublicKey } from '../utils';

export class SignerToTaquitoSigner implements Signer {
  constructor(private readonly signer: CastSigner<TezosTx, TezosSignedTx>) {}

  async publicKey(): Promise<string> {
    return this.signer.getPublicKey();
  }

  async publicKeyHash(): Promise<string> {
    return extractAddressFromPublicKey(this.signer.getPublicKey());
  }

  async secretKey(): Promise<string | undefined> {
    return '';
  }

  sign(
    // eslint-disable-next-line @typescript-eslint/ban-types
    op: {},
    magicByte?: Uint8Array,
  ): Promise<{
    bytes: string;
    sig: string;
    prefixSig: string;
    sbytes: string;
  }> {
    return this.signer.sign({
      op,
      magicByte,
    });
  }
}
