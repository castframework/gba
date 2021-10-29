import { ViewMappers } from '@castframework/blockchain-driver-tz';
import { MichelsonMap } from '@taquito/taquito';
import BigNumber from 'bignumber.js';

/// TO COMPLETE
export const FA2ViewMappers: ViewMappers<any> =
  {
    count_tokens: async (
      storage: any,
      methodParameters: unknown[],
    ): Promise<BigNumber> => {
      return storage.all_tokens;
    },
    does_token_exist: async (
      storage: any,
      methodParameters: unknown[],
    ): Promise<boolean> => {
      const token_metadata = storage.token_metadata
      return token_metadata.has(methodParameters[0] as number);
    },
    all_tokens: async (
      storage: any,
      methodParameters: unknown[],
    ): Promise<number[]> => {
      const range = n => [...Array(n).keys()];
      const all_tokens = storage.all_tokens
      return range(all_tokens);
    },
    total_supply: async (
      storage: any,
      methodParameters: unknown[],
    ): Promise<number | string> => {
      return storage.total_supply || 'total-supply not supported';
    },
    get_balance: async (
      storage: any,
      methodParameters: unknown[],
    ): Promise<BigNumber> => {
      const userKey = {
        0: methodParameters[0], // owner
        1: methodParameters[1]  // token_id
      };
      return storage.ledger.get(userKey);
    },
    // isOperatorWithRoleAuthorized: async (
    //   storage: any,
    //   methodParameters: unknown[],
    // ) => {
    //   const operatorMap = MichelsonMap.fromLiteral(
    //     { symbol: char2Bytes(`token_${all_token+1}`),
    //     operator
    //   })
    //   const operators = storage.operators;
    //   const roleNameBN: BigNumber = new BigNumber(methodParameters[1] as number);
  
    //   return (
    //     operatorsAuthorizations.has(methodParameters[0] as string) &&
    //     operatorsAuthorizations
    //       .get(methodParameters[0] as string)
    //       ?.some((value) => value.eq(roleNameBN))
    //   );
    // },
  
  };
