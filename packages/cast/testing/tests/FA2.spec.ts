import { expect } from 'chai';
import {
  getTezosExampleContractAddress,
  getTezosNodeUrl,
  getTezosPrivateKey,
} from '../../examples/src/helpers';
import { getLogger } from 'log4js';
import { TransactionManager } from '@castframework/transaction-manager';
import { FA2ViewMappers } from './blockchainSpecific';
import { ContractType } from './types';
import BigNumber from 'bignumber.js';
import { MichelsonMap } from '@taquito/taquito';
import {
  extractAddressFromSecret,
  PrivateKeySigner,
  TezosBlockchainDriver,
} from '@castframework/blockchain-driver-tz';
import { char2Bytes } from '@taquito/tzip16';

describe('FA2', () => {
  let driver: TezosBlockchainDriver;
  let transactionManager: TransactionManager<TezosBlockchainDriver>;
  beforeEach(async () => {
    const logger = getLogger('FA2');

    driver = new TezosBlockchainDriver({
      config: {
        pollingIntervalInSeconds: 1,
        defaultConfirmationCount: 1,
      },
      signer: new PrivateKeySigner(getTezosPrivateKey('admin')),
      nodeURL: getTezosNodeUrl(),
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

  it('fa2', async () => {
    const ExampleContractAddress = getTezosExampleContractAddress(
      ContractType.FA2,
    );
    const publicKey1 = extractAddressFromSecret(getTezosPrivateKey('admin'));

    // Call count_tokens
    const count_tokensPromise = await transactionManager.call({
      methodName: 'count_tokens',
      methodParameters: [],
      to: ExampleContractAddress,
      blockchainSpecificParams: {
        viewMappers: FA2ViewMappers,
      },
    });
    const count_tokens = (count_tokensPromise as BigNumber).toNumber();
    expect(count_tokens).to.not.be.undefined;

    /// Method getLastBlock
    const blockInfos = await transactionManager.getLastBlock();
    expect(blockInfos.blockHash).to.not.be.undefined;
    expect(blockInfos.blockNumber).to.be.greaterThanOrEqual(0);

    // Send mint
    const michelsonMap = MichelsonMap.fromLiteral({
      symbol: char2Bytes(`token_${count_tokens + 1}`),
    });
    const txHash = await transactionManager.send({
      methodName: 'mint',
      methodParameters: [[publicKey1, 0, michelsonMap, count_tokens]],
      to: ExampleContractAddress,
      blockchainSpecificParams: {
        viewMappers: FA2ViewMappers,
      },
    });
    expect(txHash.transactionId).to.not.be.undefined;

    // Method waitForConfirmation
    await transactionManager.waitForConfirmation(txHash.transactionId);

    // Method getTransactionInfo
    const getTransactionInfoResult =
      await transactionManager.getTransactionInfo(txHash.transactionId);
    expect(getTransactionInfoResult.id).to.be.equal(txHash.transactionId);
    expect(getTransactionInfoResult.status).to.be.equal('CONFIRMED');
    expect(getTransactionInfoResult.details.methodName).to.be.equal('mint');
    expect(getTransactionInfoResult.details.to).to.be.equal(
      ExampleContractAddress,
    );
    expect(getTransactionInfoResult.emittedEvents).to.not.be.undefined;

    const michelsonMap2 = MichelsonMap.fromLiteral({
      symbol: char2Bytes(`token_${count_tokens + 2}`),
    });
    const txHash2 = await transactionManager.send({
      methodName: 'mint',
      methodParameters: [[publicKey1, 0, michelsonMap2, count_tokens + 1]],
      to: ExampleContractAddress,
      blockchainSpecificParams: {
        viewMappers: FA2ViewMappers,
      },
      transactionParams: {
        previousTransactions: [txHash.transactionId],
      },
    });
    expect(txHash.transactionId).to.not.be.undefined;
    await transactionManager.waitForConfirmation(txHash2.transactionId);

    // Method getTransactionsInfo
    const getTransactionInfosResult =
      await transactionManager.getTransactionsInfo();
    expect(getTransactionInfosResult.length).to.be.equal(2);
    expect(getTransactionInfosResult[0].nonce).to.be.equal(
      getTransactionInfosResult[1].nonce - 1,
    );

    const count_tokensAfterPromise = await transactionManager.call({
      methodName: 'count_tokens',
      methodParameters: [],
      to: ExampleContractAddress,
      blockchainSpecificParams: {
        viewMappers: FA2ViewMappers,
      },
    });
    const count_tokensAfter = (
      count_tokensAfterPromise as BigNumber
    ).toNumber();
    expect(count_tokensAfter).to.be.equal(count_tokens + 2);
  }).timeout('60sec');
});
