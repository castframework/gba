import { ContractType } from '../../../types';
const ERC20Abi = require('./ERC20.json');
const ERC721Abi = require('./ERC721.json');

type ContractTypeMapping = {
  [key in ContractType]: any;
};

export const AbiMapping: ContractTypeMapping = {
  [ContractType.ERC20]: ERC20Abi,
  [ContractType.ERC721]: ERC721Abi,
};

export function getAbi(type: ContractType): any {
  return AbiMapping[type];
}
