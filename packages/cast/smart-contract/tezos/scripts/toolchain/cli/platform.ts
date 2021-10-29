#!/usr/bin/env ts-node

import minimist from 'minimist';
import { originateFromPathWithContext } from '../contractOriginator';
import {
  exportContractConfig,
  getNetworkConfig,
  getObjectFromFile,
} from '../utils';
import { smpLog } from '../logger';

async function dothestuff(): Promise<void> {
  const argv = minimist(process.argv.slice(2));

  const networkFolder = argv['network-folder'];

  if (typeof networkFolder !== 'string') {
    throw new Error('Network folder argument must be set');
  }

  const originationFile = `origination.json`;
  const networkConfig = getNetworkConfig(networkFolder);
  const sequence = getObjectFromFile(originationFile);

  const context = {};

  smpLog.debug(
    `Platform sequence : ${JSON.stringify(sequence, undefined, ' ')}`,
  );
  smpLog.debug(`Context: ${JSON.stringify(context, undefined, ' ')}`);

  for (const { action, ...params } of sequence) {
    switch (action) {
      case 'originate':
        smpLog.debug(`originate action : ${JSON.stringify(params)}`);
        context[params.register] = await originateFromPathWithContext(
          params.path,
          context,
          networkConfig,
        );
        break;

      default:
        smpLog.warning(`Unknown action : ${action}`);
        break;
    }
  }

  smpLog.debug('Exporting contract configuration');
  exportContractConfig(networkFolder, context);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
dothestuff();
