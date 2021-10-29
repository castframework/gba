import delay from 'delay';

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
