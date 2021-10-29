import { BlockchainDriver } from '../src';
import * as sinon from 'sinon';

export const blockchainDriverMock: BlockchainDriver<any, any> = {
  boostTransaction: sinon.stub(),
  call: sinon.stub(),
  cancelTransaction: sinon.stub(),
  getTransactionInfo: sinon.stub(),
  getTransactionsInfo: sinon.stub(),
  listen: sinon.stub(),
  send: sinon.stub(),
  close: sinon.stub(),
  getLastBlock: sinon.stub(),
  initialize: sinon.stub(),
  setLogger: sinon.stub(),
  waitForConfirmation: sinon.stub(),
};

export const blockchainDriverMockFactory = (): BlockchainDriver<any, any> => ({
  boostTransaction: sinon.stub(),
  call: sinon.stub(),
  cancelTransaction: sinon.stub(),
  getTransactionInfo: sinon.stub(),
  getTransactionsInfo: sinon.stub(),
  listen: sinon.stub(),
  send: sinon.stub(),
  close: sinon.stub(),
  getLastBlock: sinon.stub(),
  initialize: sinon.stub(),
  setLogger: sinon.stub(),
  waitForConfirmation: sinon.stub(),
});
