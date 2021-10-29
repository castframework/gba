#!/usr/bin/env ts-node

import { activateAccounts } from '../tezRedistribution';
import minimist from 'minimist';
import { smpLog } from '../logger';
import { getNetworkConfig } from '../utils';

const doTheStuff = async (): Promise<void> => {
  const argv = minimist<{ ['network-folder']: string }>(process.argv.slice(2));

  const networkFolder = argv['network-folder'];

  if (typeof networkFolder !== 'string') {
    throw new Error('Network folder argument must be set');
  }

  const networkConfig = getNetworkConfig(networkFolder);
  try {
    await activateAccounts(networkConfig);
  } catch (err) {
    smpLog.error(err);
    process.exit(1);
  }
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
doTheStuff();
