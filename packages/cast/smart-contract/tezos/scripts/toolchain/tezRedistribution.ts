import { extractAddressFromSecret, getTezosToolkit } from './utils';
import { smpLog } from './logger';
import { NetworkConfig } from './type';
import { BigNumber } from 'bignumber.js';

export async function activateAccounts(
  networkConfig: NetworkConfig,
): Promise<void> {
  const toolkit = await getTezosToolkit(networkConfig);

  const mutezToTezDivisor = 1000000;
  const giveThreshold = 1000; // Do not give Tez if account have at least this amount

  try {
    const { admin: adminPrivateKey, ...privateKeys } = networkConfig.keysConfig;

    const adminAddress = extractAddressFromSecret(adminPrivateKey);
    const adminBalanceInTez = (await toolkit.tz.getBalance(adminAddress))
      .div(mutezToTezDivisor)
      .toNumber();

    smpLog.info(`Current admin balance: ${adminBalanceInTez}ꜩ`);

    const amountForEachAccountInTez = Math.floor(
      adminBalanceInTez / (Object.keys(privateKeys).length + 1),
    );

    for (const account of Object.keys(privateKeys)) {
      const privateKey = privateKeys[account];
      const address = extractAddressFromSecret(privateKey);
      smpLog.info(
        `Sending ${amountForEachAccountInTez}ꜩ to ${account}[${address}]`,
      );
      const accountCurrentBalanceInTez = (
        await toolkit.tz.getBalance(address)
      ).div(mutezToTezDivisor);

      if (
        accountCurrentBalanceInTez.isGreaterThan(new BigNumber(giveThreshold))
      ) {
        smpLog.info(
          `${account}[${address}] balance is more than give threshold (${giveThreshold}): ${accountCurrentBalanceInTez}ꜩ. Skipping`,
        );
        continue;
      }

      const transferOperation = await toolkit.contract.transfer({
        to: address,
        amount: amountForEachAccountInTez,
      });
      await transferOperation.confirmation();

      const accountNewBalanceInTez = (await toolkit.tz.getBalance(address)).div(
        mutezToTezDivisor,
      );

      smpLog.info(
        `${account}[${address}] balance updated from ${accountCurrentBalanceInTez}ꜩ to ${accountNewBalanceInTez}ꜩ`,
      );
    }
    const adminFinalBalanceInTez = (await toolkit.tz.getBalance(adminAddress))
      .div(mutezToTezDivisor)
      .toNumber();
    smpLog.info(`Final admin balance: ${adminFinalBalanceInTez}ꜩ`);
  } catch (err) {
    smpLog.error(JSON.stringify(err));
  }
}
