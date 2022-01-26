import * as fs from 'fs';
import { ContractType } from './types';
import {
  addHexPrefix,
  bufferToHex,
  privateToAddress,
  toBuffer,
  privateToPublic,
} from 'ethereumjs-util';
type NodeFile = {
  host: string;
};

type ContractsFile = {
  ExampleERC20: string;
};

type KeysFile = Record<string, string>;

export function getEnvProcess() {
  const networkFolder = process.env.NETWORK_FOLDER;
  if (networkFolder === undefined) {
    throw new Error('Envrionment variable NETWORK_FOLDER must be set');
  }
  return { networkFolder };
}

export function isNodeFileValid(nodeFile: unknown): nodeFile is NodeFile {
  return (
    (nodeFile as any).host !== undefined &&
    typeof (nodeFile as any).host === 'string'
  );
}

export function isContractsFileValid(
  contractFile: any,
  contractType: ContractType,
): contractFile is ContractsFile {
  return (
    (contractFile as any)[contractType] !== undefined &&
    typeof (contractFile as any)[contractType] === 'string'
  );
}

export function isKeysFileValid(keysFile: unknown): keysFile is KeysFile {
  if (
    keysFile === null ||
    !(typeof keysFile === 'object' || typeof keysFile === 'function') ||
    Array.isArray(keysFile)
  ) {
    return false;
  }

  // TODO: check if every value of keysFile is a string
  return true;
}

export function getEthNodeUrl(): string {
  const { networkFolder } = getEnvProcess();
  const nodeFilePath = `${networkFolder}/ethereum/node.json`;
  let nodeFile: unknown;
  try {
    nodeFile = JSON.parse(fs.readFileSync(nodeFilePath, 'utf8'));
  } catch {
    throw new Error(`Error while reading node file ${nodeFilePath}`);
  }

  if (!isNodeFileValid(nodeFile)) {
    throw new Error(`Invalid node file at ${nodeFilePath}`);
  }

  return nodeFile.host;
}

export function getTezosNodeUrl(): string {
  const { networkFolder } = getEnvProcess();
  const nodeFilePath = `${networkFolder}/tezos/node.json`;
  let nodeFile: unknown;
  try {
    nodeFile = JSON.parse(fs.readFileSync(nodeFilePath, 'utf8'));
  } catch {
    throw new Error(`Error while reading node file ${nodeFilePath}`);
  }

  if (!isNodeFileValid(nodeFile)) {
    throw new Error(`Invalid node file at ${nodeFilePath}`);
  }

  return nodeFile.host;
}

export function getEthAddress(privateKey: string): string {
  return addHexPrefix(bufferToHex(privateToAddress(toBuffer(privateKey)))); // nearly ready for lisp eh ?
}

export function getTezosPrivateKey(account: string): string {
  const { networkFolder } = getEnvProcess();

  const keysFilePath = `${networkFolder}/tezos/keys.json`;
  let keysFile: unknown;
  try {
    keysFile = JSON.parse(fs.readFileSync(keysFilePath, 'utf8'));
  } catch {
    throw new Error(`Error while reading keys file ${keysFilePath}`);
  }

  if (!isKeysFileValid(keysFile)) {
    throw new Error(`Invalid contracts file at ${keysFilePath}`);
  }

  if (!keysFile[account]) {
    throw new Error(`No account for ${account} in keys file ${keysFilePath}`);
  }
  return keysFile[account];
}

export function getEthPrivateKey(account: string): string {
  const { networkFolder } = getEnvProcess();

  const keysFilePath = `${networkFolder}/ethereum/keys.json`;
  let keysFile: unknown;
  try {
    keysFile = JSON.parse(fs.readFileSync(keysFilePath, 'utf8'));
  } catch {
    throw new Error(`Error while reading keys file ${keysFilePath}`);
  }

  if (!isKeysFileValid(keysFile)) {
    throw new Error(`Invalid contracts file at ${keysFilePath}`);
  }

  if (!keysFile[account]) {
    throw new Error(`No account for ${account} in keys file ${keysFilePath}`);
  }
  return keysFile[account];
}

export function getEthExampleContractAddress(
  contractType: ContractType,
): string {
  const { networkFolder } = getEnvProcess();
  const contractFilePath = `${networkFolder}/ethereum/contracts.json`;
  let contractFile: unknown;
  try {
    contractFile = JSON.parse(fs.readFileSync(contractFilePath, 'utf8'));
  } catch {
    throw new Error(`Error while reading contracts file ${contractFilePath}`);
  }
  if (!isContractsFileValid(contractFile, contractType)) {
    throw new Error(`Invalid contracts file at ${contractFilePath}`);
  }
  return contractFile[contractType];
}

export function getTezosExampleContractAddress(
  contractType: ContractType,
): string {
  const { networkFolder } = getEnvProcess();
  const contractFilePath = `${networkFolder}/tezos/contracts.json`;
  let contractFile: unknown;
  try {
    contractFile = JSON.parse(fs.readFileSync(contractFilePath, 'utf8'));
  } catch {
    throw new Error(`Error while reading contracts file ${contractFilePath}`);
  }
  if (!isContractsFileValid(contractFile, contractType)) {
    throw new Error(`Invalid contracts file at ${contractFilePath}`);
  }
  return contractFile[contractType];
}
