import { expect } from 'chai';
import {
  EthereumBlockchainDriver,
  PrivateKeySigner,
} from '@castframework/blockchain-driver-eth';
import { first } from 'rxjs/operators';
import { getLogger } from 'log4js';

import { TransactionManager } from '@castframework/transaction-manager';
import { getAbi } from './blockchainSpecific';
import { ContractType } from './types';
import {
  getEthAddress,
  getEthExampleContractAddress,
  getEthNodeUrl,
  getEthPrivateKey,
} from './helpers';
import { wait } from '@castframework/blockchain-driver-tz';

describe('ERC20', () => {
  let driver: EthereumBlockchainDriver;
  let transactionManager: TransactionManager<EthereumBlockchainDriver>;
  beforeEach(async () => {
    const logger = getLogger('ERC20');

    driver = new EthereumBlockchainDriver({
      config: {
        eventDelayInBlocks: 0,
      },
      signer: new PrivateKeySigner(getEthPrivateKey('example1')),
      nodeURL: getEthNodeUrl(),
    });
    driver.setLogger(logger);
    transactionManager = new TransactionManager({
      logger: logger,
      driver: driver,
    });
  });

  afterEach(async () => {
    await transactionManager.close();
  });

  it('erc20', async () => {
    const abi = getAbi(ContractType.ERC20);
    const ExampleERC20Address = getEthExampleContractAddress(ContractType.ERC20);
    const tokenToTransfer = 1;
    const publicKey2 = getEthAddress(getEthPrivateKey('2'));
    const publicKey3 = getEthAddress(getEthPrivateKey('2'));

    /// Call balanceOf
    const balanceOfBefore: string = await transactionManager.call({
      methodName: 'balanceOf',
      methodParameters: [publicKey2],
      to: ExampleERC20Address,
      blockchainSpecificParams: {
        abi,
      },
    });
    expect(balanceOfBefore).to.not.be.undefined;

    /// Method getLastBlock
    const blockInfos = await transactionManager.getLastBlock();
    expect(blockInfos.blockHash).to.not.be.undefined;
    expect(blockInfos.blockNumber).to.be.greaterThanOrEqual(0);

    // Listen Transfer Event
    const transfert$ = transactionManager.listen({
      smartContractAddress: ExampleERC20Address,
      eventName: 'Transfer',
      blockchainSpecificParams: {
        abi,
      },
    });
    const eventPromise = transfert$.pipe(first()).toPromise();

    // Send transfer
    const txHashPromise = transactionManager.send({
      methodName: 'transfer',
      methodParameters: [publicKey2, tokenToTransfer],
      to: ExampleERC20Address,
      blockchainSpecificParams: {
        abi,
      },
    });
    const [txHash, event] = await Promise.all([txHashPromise, eventPromise]);
    expect(event.eventName).to.be.equal('Transfer');
    expect(event.transactionId).to.be.equal(txHash.transactionId);
    expect(event.smartContractAddress).to.be.equal(ExampleERC20Address);

    // Method waitForConfirmation
    await transactionManager.waitForConfirmation(txHash.transactionId)

    // Method getTransactionInfo
    const getTransactionInfoResult = await transactionManager.getTransactionInfo(txHash.transactionId);
    expect(getTransactionInfoResult.id).to.be.equal(txHash.transactionId);
    expect(getTransactionInfoResult.status).to.be.equal('CONFIRMED');
    expect(getTransactionInfoResult.details.methodName).to.be.equal('transfer');
    expect(getTransactionInfoResult.details.to).to.be.equal(ExampleERC20Address);
    expect(getTransactionInfoResult.emittedEvents).to.not.be.undefined;

    await transactionManager.send({
      methodName: 'transfer',
      methodParameters: [publicKey3, tokenToTransfer],
      to: ExampleERC20Address,
      blockchainSpecificParams: {
        abi,
      },
      transactionParams: {
        previousTransactions: [txHash.transactionId]
      }
    });

    // Method getTransactionsInfo
    const getTransactionInfosResult = await transactionManager.getTransactionsInfo();
    expect(getTransactionInfosResult.length).to.be.equal(2);
    expect(getTransactionInfosResult[0].nonce).to.be.equal(getTransactionInfosResult[1].nonce - 1);

    const balanceOfafter: string = await transactionManager.call({
      methodName: 'balanceOf',
      methodParameters: [publicKey2],
      to: ExampleERC20Address,
      blockchainSpecificParams: {
        abi,
      },
    });
    expect(Number.parseInt(balanceOfafter)).to.be.equal(Number.parseInt(balanceOfBefore) + 2);

  }).timeout('60sec');;
})
