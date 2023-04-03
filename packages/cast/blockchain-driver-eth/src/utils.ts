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
): Promise<void> {
  const end = Date.now() + msTimeout;
  while (!(await testFn()) && Date.now() < end) {
    await delay(msInterval);
  }
  if (!(await testFn())) {
    throw new Error('Timeout reached');
  }
}

export function replaceNullByDefaultValue(
  methodParameter: unknown[] | undefined,
): unknown[] | undefined {
  if (!methodParameter) {
    return methodParameter;
  }
  if (!Array.isArray(methodParameter)) {
    throw new Error('methodParameter is not an array');
  }
  if (methodParameter[0].guarantor.account === null) {
    methodParameter[0].guarantor.account =
      '0x0000000000000000000000000000000000000000';
  }
  if (methodParameter[0].guarantor.lei === null) {
    methodParameter[0].guarantor.lei = '';
  }
  // default payingAgent
  if (methodParameter[0].payingAgent.account === null) {
    methodParameter[0].payingAgent.account =
      '0x0000000000000000000000000000000000000000';
  }
  if (methodParameter[0].payingAgent.lei === null) {
    methodParameter[0].payingAgent.lei = '';
  }
  return methodParameter;
}
