import 'mocha';
import { getLogger } from 'log4js';
import { blockchainDriverMockFactory } from './BlockchainDriver.mock';
import * as sinon from 'sinon';
import { BlockchainDriver, ListenParams } from '@castframework/types';
import { TransactionManager } from '../src/TransactionManager';

describe('Transaction Manager', () => {
  let driver: BlockchainDriver<any, any>;
  let transactionManager: TransactionManager<BlockchainDriver<any, any>>;

  beforeEach(async () => {
    driver = blockchainDriverMockFactory();

    transactionManager = new TransactionManager({
      logger: getLogger('Transaction Manager test'),
      driver: driver,
    });
  });

  afterEach(async () => {
    await transactionManager.close();
  });

  it('should forward initialize', async () => {
    await transactionManager.initialize();

    sinon.assert.calledOnce(driver.initialize);
    sinon.assert.calledWithExactly(driver.initialize);
  });

  it('should forward send', async () => {
    const abstractTransaction = {
      methodName: 'methodName',
      to: '',
    };
    await transactionManager.send(abstractTransaction);

    sinon.assert.calledOnce(driver.send);
    sinon.assert.calledWithExactly(driver.send, abstractTransaction);
  });

  it('should forward cancelTransaction', async () => {
    const transactionId = 'transactionId';
    await transactionManager.cancelTransaction(transactionId);

    sinon.assert.calledOnce(driver.cancelTransaction);
    sinon.assert.calledWithExactly(
      driver.cancelTransaction,
      transactionId,
      undefined,
    );
  });

  it('should forward boostTransaction', async () => {
    const transactionId = 'transactionId';
    await transactionManager.boostTransaction(transactionId);

    sinon.assert.calledOnce(driver.boostTransaction);
    sinon.assert.calledWithExactly(
      driver.boostTransaction,
      transactionId,
      undefined,
    );
  });

  it('should forward listen', async () => {
    const listenParams: ListenParams<any> = {
      eventName: 'eventNameValue',
      blockchainSpecificParams: {
        blockchainSpecificParamsProperty:
          'blockchainSpecificParamsPropertyValue',
      },
      from: 0,
      smartContractAddress: 'smartContractAddressValue',
    };
    await transactionManager.listen(listenParams);

    sinon.assert.calledOnce(driver.listen);
    sinon.assert.calledWithExactly(driver.listen, listenParams);
  });

  it('should forward getTransactionInfo', async () => {
    const transactionId = 'transactionId';
    await transactionManager.getTransactionInfo(transactionId);

    sinon.assert.calledOnce(driver.getTransactionInfo);
    sinon.assert.calledWithExactly(driver.getTransactionInfo, transactionId);
  });

  it('should forward getTransactionsInfo', async () => {
    await transactionManager.getTransactionsInfo();

    sinon.assert.calledOnce(driver.getTransactionsInfo);
    sinon.assert.calledWithExactly(driver.getTransactionsInfo);
  });

  it('should forward waitForConfirmation', async () => {
    const transactionId = 'transactionId';
    await transactionManager.waitForConfirmation(transactionId);

    sinon.assert.calledOnce(driver.waitForConfirmation);
    sinon.assert.calledWithExactly(driver.waitForConfirmation, transactionId);
  });

  it('should forward getLastBlock', async () => {
    await transactionManager.getLastBlock();

    sinon.assert.calledOnce(driver.getLastBlock);
    sinon.assert.calledWithExactly(driver.getLastBlock);
  });

  it('should forward call', async () => {
    const abstractTransaction = {
      methodName: 'methodName',
      to: '',
    };
    await transactionManager.call(abstractTransaction);

    sinon.assert.calledOnce(driver.call);
    sinon.assert.calledWithExactly(driver.call, abstractTransaction);
  });

  it('should forward close', async () => {
    await transactionManager.close();

    sinon.assert.calledOnce(driver.close);
    sinon.assert.calledWithExactly(driver.close);
  });
});
