import { ContractType } from '../../../types';
import ERC20Abi from './ERC20.json';
import ERC721Abi from './ERC721.json';

type ContractTypeMapping = {
  [key in ContractType]: any;
};

export const AbiMapping: ContractTypeMapping = {
  [ContractType.ERC20]: ERC20Abi,
  [ContractType.ERC721]: ERC721Abi,
  [ContractType.FA2]: undefined,
};

export function getAbi(type: ContractType): any {
  return AbiMapping[type];
}
