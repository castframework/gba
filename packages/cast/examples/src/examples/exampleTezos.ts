import {
  TezosBlockchainDriver,
  PrivateKeySigner,
  extractAddressFromSecret
} from '@castframework/blockchain-driver-tz';
import { TransactionManager } from '@castframework/transaction-manager';
import * as log4js from 'log4js';
import {
  getTezosPrivateKey,
  getTezosExampleContractAddress,
  getTezosNodeUrl,
} from '../helpers';
import { getAbi } from '../blockchainSpecific';
import { ContractType } from '../types';
import { first, multicast, shareReplay } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { FA2ViewMappers } from '../blockchainSpecific/tz/viewMappers/FA2';
import { MichelsonMap } from '@taquito/taquito';
import { BigNumber } from 'bignumber.js';
import { char2Bytes } from '@taquito/tzip16';

async function send(): Promise<void> {
  const driver = new TezosBlockchainDriver({
    config: {
      pollingIntervalInSeconds: 1,
      defaultConfirmationCount: 1,
    },
    signer: new PrivateKeySigner(getTezosPrivateKey('admin')),
    nodeURL: getTezosNodeUrl(),
  });

  const transactionManager = new TransactionManager({
    logger: log4js.getLogger('example1'),
    driver: driver,
  });

  const ExampleContractAddress = getTezosExampleContractAddress(ContractType.FA2);
  const publicKey1 = extractAddressFromSecret(getTezosPrivateKey('admin'));
  console.log({ publicKey1 });

  const count_tokensPromise = await transactionManager.call({
    methodName: 'count_tokens',
    methodParameters: [],
    to: ExampleContractAddress,
    blockchainSpecificParams: {
      viewMappers: FA2ViewMappers
    },
  });
  const count_tokens = (count_tokensPromise as BigNumber).toNumber()
  console.log({count_tokens});


  const michelsonMap = MichelsonMap.fromLiteral({ symbol: char2Bytes(`token_${count_tokens+1}`) });
  const txHash = await transactionManager.send({
    methodName: 'mint',
    methodParameters: [[publicKey1, 0, michelsonMap, count_tokens]],
    to: ExampleContractAddress,
    blockchainSpecificParams: {
      viewMappers: FA2ViewMappers
    },
  });
  console.log({ txHash });

  // const get_balancePromise = await transactionManager.call({
  //   methodName: 'get_balance',
  //   methodParameters: [publicKey1,0],
  //   to: ExampleContractAddress,
  //   blockchainSpecificParams: {
  //     viewMappers: FA2ViewMappers
  //   },
  // });
  // const get_balance = (get_balancePromise as BigNumber).toNumber()
  // console.log({get_balance});

  

  await transactionManager.close();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
send();
