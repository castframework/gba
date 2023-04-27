import { ContractSendMethod } from 'web3-eth-contract';
import delay from 'delay';

export function isContractSendMethod(
  web3Transaction: any,
): web3Transaction is ContractSendMethod {
  // TODO implement
  return true;
}

export async function waitFor(
  testFn: () => boolean | Promise<boolean>,
  msInterval: number,
  msTimeout: number,
  timeoutMessage: string,
): Promise<void> {
  const end = Date.now() + msTimeout;
  while (!(await testFn()) && Date.now() < end) {
    await delay(msInterval);
  }
  if (!(await testFn())) {
    throw new Error(`Timeout reached: ${timeoutMessage}`);
  }
}
