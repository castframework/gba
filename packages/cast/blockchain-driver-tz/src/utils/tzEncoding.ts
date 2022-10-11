/* eslint-disable import/namespace */
import * as bs58check from 'bs58check';
import * as blake from 'blakejs';
import BigNumber from 'bignumber.js';

export const prefix = {
  tz1: new Uint8Array([6, 161, 159]),
  tz2: new Uint8Array([6, 161, 161]),
  tz3: new Uint8Array([6, 161, 164]),
  KT: new Uint8Array([2, 90, 121]),
  edpk: new Uint8Array([13, 15, 37, 217]),
  edsk2: new Uint8Array([13, 15, 58, 7]),
  spsk: new Uint8Array([17, 162, 224, 201]),
  p2sk: new Uint8Array([16, 81, 238, 189]),
  sppk: new Uint8Array([3, 254, 226, 86]),
  p2pk: new Uint8Array([3, 178, 139, 127]),
  edesk: new Uint8Array([7, 90, 60, 179, 41]),
  edsk: new Uint8Array([43, 246, 78, 7]),
  edsig: new Uint8Array([9, 245, 205, 134, 18]),
  spsig1: new Uint8Array([13, 115, 101, 19, 63]),
  p2sig: new Uint8Array([54, 240, 44, 52]),
  sig: new Uint8Array([4, 130, 43]),
  Net: new Uint8Array([87, 82, 0]),
  nce: new Uint8Array([69, 220, 169]),
  b: new Uint8Array([1, 52]),
  o: new Uint8Array([5, 116]),
  Lo: new Uint8Array([133, 233]),
  LLo: new Uint8Array([29, 159, 109]),
  P: new Uint8Array([2, 170]),
  Co: new Uint8Array([79, 179]),
  id: new Uint8Array([153, 103]),
};

export function b58encode(payload, prefix) {
  const n = new Uint8Array(prefix.length + payload.length);
  n.set(prefix);
  n.set(payload, prefix.length);
  return bs58check.encode(Buffer.from(n));
}

function b58decode(enc, prefix) {
  return bs58check.decode(enc).slice(prefix.length);
}

export function extractAddressFromSecret(secretKey: string): string {
  if (secretKey.length === 98) {
    return b58encode(
      blake.blake2b(b58decode(secretKey, prefix.edsk).slice(32), undefined, 20),

      prefix.tz1,
    );
  } else {
    throw 'invalid secret key';
  }
}

export function extractPublicKeyFromSecret(secretKey: string): string {
  if (secretKey.length === 98) {
    return b58encode(b58decode(secretKey, prefix.edsk).slice(32), prefix.edpk);
  } else {
    throw 'invalid secret key';
  }
}
export function extractAddressFromPublicKey(publicKey: string): string {
  return b58encode(
    blake.blake2b(b58decode(publicKey, prefix.edsk), undefined, 20),
    prefix.tz1,
  );
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    console.log(`waiting ${ms} ms...`);
    setTimeout(resolve, ms);
  });
}

// this is just @taquito/utils' version + handling of bignumber for int values
export const mic2arr = function me2(s: any): any {
  let ret: any = [];
  if (Object.prototype.hasOwnProperty.call(s, 'prim')) {
    if (s.prim === 'Pair') {
      ret.push(me2(s.args[0]));
      ret = ret.concat(me2(s.args[1]));
    } else if (s.prim === 'Elt') {
      ret = {
        key: me2(s.args[0]),
        val: me2(s.args[1]),
      };
    } else if (s.prim === 'True') {
      ret = true;
    } else if (s.prim === 'False') {
      ret = false;
    }
  } else if (Array.isArray(s)) {
    const sc = s.length;
    for (let i = 0; i < sc; i++) {
      const n = me2(s[i]);
      if (typeof n.key !== 'undefined') {
        if (Array.isArray(ret)) {
          ret = {
            keys: [],
            vals: [],
          };
        }
        ret.keys.push(n.key);
        ret.vals.push(n.val);
      } else {
        ret.push(n);
      }
    }
  } else if (Object.prototype.hasOwnProperty.call(s, 'string')) {
    ret = s.string;
  } else if (Object.prototype.hasOwnProperty.call(s, 'int')) {
    ret = new BigNumber(s.int, 10);
  } else {
    ret = s;
  }
  return ret;
};
