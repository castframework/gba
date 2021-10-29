import * as YAML from 'yaml';
import * as fs from 'fs';
import {
  addHexPrefix,
  bufferToHex,
  privateToAddress,
  toBuffer,
} from 'ethereumjs-util';

export function getEthAddress(privateKey: string): string {
  return addHexPrefix(bufferToHex(privateToAddress(toBuffer(privateKey)))); // nearly ready for lisp eh ?
}

export function getRegistrarAddressForNetwork(networkFolder: string): string {
  const keyFilePath = `${networkFolder}/ethereum/keys.json`;
  let keyFile: any;
  try {
    keyFile = fs.readFileSync(keyFilePath, 'utf8');
  } catch (e) {
    throw new Error(
      `Could not read keys.json file for network file ${networkFolder}: ${e.toString()}`,
    );
  }

  let keys: any;
  try {
    keys = JSON.parse(keyFile);
  } catch (e) {
    throw new Error(
      `Could not parse keys.json file for network file ${networkFolder}: ${e.toString()}`,
    );
  }

  if (keys?.registrar === null || keys?.registrar === undefined) {
    throw new Error(
      `Could not find registrar private key in keys.json for network file ${networkFolder}`,
    );
  }

  if (typeof keys?.registrar !== 'string') {
    throw new Error(
      `Invalid registrar address in keys.json. Value should be a string`,
    );
  }

  return getEthAddress(keys?.registrar);
}
