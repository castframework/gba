import { Event } from '@castframework/types';
import {
  InternalOperationResult,
  OperationContents,
  OperationContentsAndResult,
  OperationContentsAndResultTransaction,
  OperationEntry,
  OpKind,
} from '@taquito/rpc';
import { evaluateFilter } from '@taquito/taquito/dist/lib/subscribe/filters';
import { mic2arr } from './utils';
import * as R from 'ramda';
import { Filter } from '@taquito/taquito';
import { EventMappers } from './types';
import { flattenDeep } from 'lodash';

type WithOpHash = { opHash: string };

export const getAllContentsAddOpHash = R.chain(
  (operationEntry: OperationEntry) =>
    operationEntry.contents.map(
      (c) =>
        ({
          opHash: operationEntry.hash,
          ...c,
        } as OperationContentsAndResultTransaction & WithOpHash),
    ),
);

export const getAllInternalOperationAddOpHash = R.chain<
  OperationContentsAndResultTransaction & WithOpHash,
  InternalOperationResult & WithOpHash,
  never
>(
  (tio: OperationContentsAndResultTransaction & WithOpHash) =>
    tio.metadata.internal_operation_results?.map(
      (ior) =>
        ({
          opHash: tio.opHash,
          ...ior,
        } as InternalOperationResult & WithOpHash),
    ) || [],
);

export const takeOperationContentToAddressWithInternalOp = (
  smartContractAddress: string,
): (<T extends (OperationContents | OperationContentsAndResult)[]>(
  c: T,
) => T) =>
  R.filter<OperationContents | OperationContentsAndResult>((content) => {
    const isSourceTransaction = evaluateFilter(content, {
      destination: smartContractAddress,
      kind: OpKind.TRANSACTION,
    } as Filter);

    const hasInternalOperationResults = (
      content as OperationContentsAndResultTransaction
    )?.metadata.internal_operation_results;

    return isSourceTransaction && hasInternalOperationResults;
  });

export const takeEvent = <EventType extends Event<string>>(
  sourceContract: EventType['smartContractAddress'],
  eventNameFilter?: EventType['eventName'],
) =>
  R.filter<InternalOperationResult>((ior) => {
    const eventName = ior?.tag;
    const isKindEvent = ior.kind === OpKind.EVENT;
    const isFromRelevantSource = ior.source === sourceContract;

    const hasRelevantName =
      eventNameFilter === undefined ||
      eventNameFilter === eventName ||
      eventNameFilter === 'allEvents';

    return isKindEvent && hasRelevantName && isFromRelevantSource;
  });

export const formatEvent = (
  smartContractAddress: string,
  blockNumber: number,
  blockHash: string,
  eventMappers: EventMappers,
) =>
  R.map((ior: InternalOperationResult & WithOpHash): Event<string> => {
    const eventName = ior.tag;
    const eventPayload = mic2arr(ior.payload);

    if (eventName === undefined) {
      throw new Error(
        `No event name (entrypoint) found for event ${eventName}`,
      );
    }

    if (eventMappers?.[eventName] === undefined) {
      throw new Error(`No event mapper for event ${eventName}`);
    }

    const payload = eventMappers?.[eventName](
      eventName,
      Array.isArray(eventPayload)
        ? flattenDeep<any>(eventPayload)
        : [eventPayload],
    );

    return {
      eventName,
      blockNumber,
      payload,
      transactionId: ior.opHash,
      blockHash,
      smartContractAddress,
    };
  });
