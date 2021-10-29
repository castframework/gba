import {
    EthereumBlockchainDriver,
    PrivateKeySigner,
  } from '@castframework/blockchain-driver-eth';
  import { TransactionManager } from '@castframework/transaction-manager';
  import * as log4js from 'log4js';
  import {
    getEthPrivateKey,
    getEthExampleContractAddress,
    getEthNodeUrl,
    getEthAddress,
  } from '../helpers';
  import { getAbi } from '../blockchainSpecific';
  import { ContractType } from '../types';
  import { first, multicast, shareReplay } from 'rxjs/operators';
  import { ReplaySubject } from 'rxjs';
  
  async function send(): Promise<void> {
  
    const driver = new EthereumBlockchainDriver({
      config: {
        eventDelayInBlocks: 0,
      },
      signer: new PrivateKeySigner(getEthPrivateKey('example1')),
      nodeURL: getEthNodeUrl(),
    });
  
    const transactionManager = new TransactionManager({
      logger: log4js.getLogger('example1'),
      driver: driver,
    });
  
    const abi = getAbi(ContractType.ERC20);
    const ExampleERC20Address = getEthExampleContractAddress(ContractType.ERC20);
    const publicKey2 = getEthAddress(getEthPrivateKey('2'));
  
    const balanceOfBefore = await transactionManager.call({
      methodName: 'balanceOf',
      methodParameters: [publicKey2],
      to: ExampleERC20Address,
      blockchainSpecificParams: {
        abi,
      },
    });
    console.log({ balanceOfBefore });
    
    const blockInfo = await transactionManager.getLastBlock();
    console.log({blockInfo})
  
    const transfert$ = transactionManager.listen({
      smartContractAddress: ExampleERC20Address,
      eventName: 'Transfer',
      blockchainSpecificParams: {
        abi,
      },
    });
    const eventPromise = transfert$.pipe(first()).toPromise();
    const tokenToTransfer = 1;
    const txHashPromise = transactionManager.send({
      methodName: 'transfer',
      methodParameters: [publicKey2, tokenToTransfer],
      to: ExampleERC20Address,
      blockchainSpecificParams: {
        abi,
      },
    });
  
    await Promise.all([txHashPromise,eventPromise]).then(([txHash, event]) => console.log({txHash,event}))
    
    const balanceOfafter = await transactionManager.call({
      methodName: 'balanceOf',
      methodParameters: [publicKey2],
      to: ExampleERC20Address,
      blockchainSpecificParams: {
        abi,
      },
    });
    console.log({ balanceOfafter });
  
  
    await transactionManager.close();
  }
  
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  send();
  