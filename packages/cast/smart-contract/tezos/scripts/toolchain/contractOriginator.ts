import * as util from 'util';
import { TezosOperationError } from '@taquito/taquito';
import {
  JSONMichelson,
  MichelsonExpression,
  NetworkConfig,
  TezosAddress,
} from './type';
import {
  getTezosToolkit,
  getObjectFromFile,
  getStringFromFile,
  solveWildCard,
} from './utils';
import { buildStorage } from './build';
import { smpLog } from './logger';

export async function originateContract(
  contractName: string,
  code: JSONMichelson,
  storageInit: MichelsonExpression,
  network: NetworkConfig,
): Promise<TezosAddress> {
  const toolkit = await getTezosToolkit(network);

  try {
    smpLog.info(`Begin '${contractName}' origination...`);

    const originationOp = await toolkit.contract.originate({
      code,
      init: storageInit,
    });

    await originationOp.confirmation();

    const contractOriginationOp = await originationOp.contract();

    smpLog.info(
      `New ${contractName} has been originated at [${contractOriginationOp.address}] with operationHash[${originationOp.hash}] consumedGas[${originationOp.consumedGas}] fee[${originationOp.fee}]`,
    );

    return contractOriginationOp.address;
  } catch (e) {
    if (e instanceof TezosOperationError) {
      smpLog.error(`Local Error for ${contractName}`);
      smpLog.error(util.inspect(e.errors, false, null, true));
    } else {
      smpLog.error(
        `PublicNode Error for ${contractName} : ${
          e instanceof Error ? e.message : JSON.stringify(e)
        }`,
      );
    }
    throw e;
  }
}

export async function originateFromPathWithContext(
  directoryPath: string,
  context: { [key: string]: string },
  network: NetworkConfig,
): Promise<TezosAddress> {
  smpLog.trace('originateFromPathWithContext');

  const name = directoryPath.split('/').reverse()[0];

  const storage = buildStorage(
    getStringFromFile(solveWildCard(`${directoryPath}/dist/**/*_storage.tz`)),
    context,
  );

  smpLog.debug(`Generated storage : ${storage}`);

  const code = getObjectFromFile(
    solveWildCard(`${directoryPath}/dist/**/*_contract.json`),
  );
  const address = await originateContract(name, code, storage, network);

  return address;
}
