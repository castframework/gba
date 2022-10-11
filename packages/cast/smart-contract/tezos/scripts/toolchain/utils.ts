import * as fs from 'fs';
import { PollingSubscribeProvider, TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import {
  ContractsConfig,
  FlexTesaAccount,
  NetworkConfig,
  SmpConfig,
  TezosAddress,
  TezosKey,
} from './type';
import { smpLog } from './logger';
import { ls } from 'shelljs';
import * as bs58check from 'bs58check';
import * as blake from 'blakejs';

function isTezosAddress(address: any): address is TezosAddress {
  if (!address || typeof address !== 'string') {
    return false;
  }
  return true;
}

function isTezosKey(address: any): address is TezosKey {
  if (!address || typeof address !== 'string') {
    return false;
  }
  return true;
}

function isFlexTesaAccount(account: any): account is FlexTesaAccount {
  if (!isTezosAddress(account.publicAddress)) {
    smpLog.error(
      `config publicAddress property is not a defined or not a valid Tezos address`,
    );
    return false;
  }

  if (!isTezosKey(account.privateKey)) {
    smpLog.error(
      `config privateKey property is not a defined or not a valid Tezos key`,
    );
    return false;
  }
  return true;
}

function isSmpConfig(conf: any): conf is SmpConfig {
  if (!conf.srcDir || typeof conf.srcDir !== 'string') {
    smpLog.error(`config srcDir property is not defined or isn't a string`);
    return false;
  }
  if (!conf.pattern || typeof conf.pattern !== 'string') {
    smpLog.error(`config pattern property is not defined or isn't a string`);
    return false;
  }
  return true;
}

export async function getTezosToolkit(
  networkConfig: NetworkConfig,
): Promise<TezosToolkit> {
  const toolkit = new TezosToolkit(networkConfig.nodeConfig.host);

  toolkit.setProvider({
    rpc: networkConfig.nodeConfig.host,
    signer: new InMemorySigner(networkConfig.keysConfig.admin),
    config: {
      confirmationPollingTimeoutSecond: 3600,
    },
  });
  toolkit.setStreamProvider(
    toolkit.getFactory(PollingSubscribeProvider)({
      pollingIntervalMilliseconds: 1000,
    }),
  );

  return toolkit;
}

export function getObjectFromFile(filePath: string): any {
  smpLog.trace('getObjectFromFile');
  return JSON.parse(fs.readFileSync(filePath).toString());
}

export function solveWildCard(filePath: string): string {
  smpLog.trace(`solveWildcard(${filePath})`);
  const k = ls(filePath);
  return k[0];
}

export function getStringFromFile(filePath: string): string {
  // TODO michelsonJSON type guard
  smpLog.trace('getStringFromFile');
  return fs.readFileSync(filePath).toString();
}

const prefix = {
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

export function extractPublicKeyFromSecret(secretKey: string): string {
  if (secretKey.length === 98) {
    return b58encode(b58decode(secretKey, prefix.edsk).slice(32), prefix.edpk);
  } else {
    throw 'invalid secret key';
  }
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

export function getNetworkConfig(networkFolder?: string): NetworkConfig {
  if (typeof networkFolder !== 'string') {
    throw new Error('Network folder argument must be set');
  }

  const keysConfig = getObjectFromFile(`${networkFolder}/tezos/keys.json`);
  const nodeConfig = getObjectFromFile(`${networkFolder}/tezos/node.json`);

  return {
    keysConfig,
    nodeConfig,
  };
}

export function exportContractConfig(
  networkFolder: string,
  contractConfig: ContractsConfig,
) {
  fs.writeFileSync(
    `${networkFolder}/tezos/contracts.json`,
    JSON.stringify(contractConfig, null, ' '),
  );
}
