import 'mocha';
import { expect } from 'chai';
import { BlockResponse, OperationEntry } from '@taquito/rpc';
import { BigNumber } from 'bignumber.js';
import * as R from 'ramda';

import {
  formatEvent,
  getAllContentsAddOpHash,
  getAllInternalOperationAddOpHash,
  takeEvent,
  takeOperationContentToAddressWithInternalOp,
} from '../../src/rpcParser';

import operations from '../testData/blockToEvent/operations.json';
import contents from '../testData/blockToEvent/contents.json';
import contents_filtered from '../testData/blockToEvent/contents_filtered.json';
import internalOp from '../testData/blockToEvent/internalOp.json';
import event_Test from '../testData/blockToEvent/event_Test.json';
import block from '../testData/blockToEvent/fromRpc.json';

import { TezosBlockchainDriver } from '../../src';

describe('blockToEvent', () => {
  const tezosDriver = new TezosBlockchainDriver({
    signer: {
      sign: () =>
        Promise.resolve({
          bytes: '',
          sig: '',
          prefixSig: '',
          sbytes: '',
        }),
      getPublicKey: () => '',
    },
    nodeURL: '',
    config: {
      pollingIntervalInSeconds: 0,
    },
  });

  it('should retrieve contents', () => {
    const result = getAllContentsAddOpHash(operations as OperationEntry[]);
    expect(result).to.be.eql(contents);
  });

  it('should filter contents', () => {
    const result = takeOperationContentToAddressWithInternalOp(
      'KT1JxWuoXHoUSH7qNnRi8S5CqEha7YJrxWKk',
    )(contents as []);
    expect(result).to.be.eql(contents_filtered);
  });

  it('should get all internal op', () => {
    const result = getAllInternalOperationAddOpHash(contents_filtered as []);
    expect(result).to.be.eql(internalOp);
  });

  it('should get only the events', () => {
    const result = takeEvent('Test')(internalOp as []);
    expect(result).to.be.eql(event_Test);
  });

  it('should format the event', () => {
    const mapper = {
      Test: (_, payload) => ({
        name: payload[0],
        hp: payload[1],
        credit: payload[2],
      }),
    };
    const result = formatEvent(
      'KT1JxWuoXHoUSH7qNnRi8S5CqEha7YJrxWKk',
      0,
      'hash',
      mapper,
    )(event_Test as []);

    expect(result).to.be.eql([
      {
        eventName: 'Test',
        smartContractAddress: 'KT1JxWuoXHoUSH7qNnRi8S5CqEha7YJrxWKk',
        blockNumber: 0,
        blockHash: 'hash',
        transactionId: 'op3v1BS9vA8QwmS2yssYUpDGT6rEx5bbPWX8ALYruMQBbQGAC9o',
        payload: {
          name: 'Bond',
          hp: BigNumber(101),
          credit: BigNumber(-90),
        },
      },
    ]);
  });

  it('should be able to chain', () => {
    const mapper = {
      Test: (_, paylaod) => ({
        name: paylaod[0],
        hp: paylaod[1],
        credit: paylaod[2],
      }),
    };

    const result = R.pipe(
      getAllContentsAddOpHash,
      takeOperationContentToAddressWithInternalOp(
        'KT1JxWuoXHoUSH7qNnRi8S5CqEha7YJrxWKk',
      ),
      getAllInternalOperationAddOpHash,
      takeEvent('Test'),
      formatEvent('KT1JxWuoXHoUSH7qNnRi8S5CqEha7YJrxWKk', 0, 'hash', mapper),
    )(operations as OperationEntry[]);

    expect(result).to.be.eql([
      {
        eventName: 'Test',
        smartContractAddress: 'KT1JxWuoXHoUSH7qNnRi8S5CqEha7YJrxWKk',
        blockNumber: 0,
        blockHash: 'hash',
        transactionId: 'op3v1BS9vA8QwmS2yssYUpDGT6rEx5bbPWX8ALYruMQBbQGAC9o',
        payload: {
          name: 'Bond',
          hp: BigNumber(101),
          credit: BigNumber(-90),
        },
      },
    ]);
  });

  it('should be able to process a block', () => {
    const mapper = {
      Test: (_, paylaod) => ({
        name: paylaod[0],
        hp: paylaod[1],
        credit: paylaod[2],
      }),
    };

    const result = tezosDriver.blockToEvents(
      block as BlockResponse,
      'KT1JxWuoXHoUSH7qNnRi8S5CqEha7YJrxWKk',
      'Test',
      mapper,
    );

    expect(result).to.be.eql([
      {
        eventName: 'Test',
        smartContractAddress: 'KT1JxWuoXHoUSH7qNnRi8S5CqEha7YJrxWKk',
        blockNumber: 971,
        blockHash: 'BMGEfRkP2hUjvzmy9kaB8p7iE6xfE5P2vaajErf6NMpuMz8FCQv',
        transactionId: 'op3v1BS9vA8QwmS2yssYUpDGT6rEx5bbPWX8ALYruMQBbQGAC9o',
        payload: {
          name: 'Bond',
          hp: BigNumber(101),
          credit: BigNumber(-90),
        },
      },
    ]);
  });
});
