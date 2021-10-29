/* istanbul ignore file */
import { Logger } from '@castframework/types';

export const trashBinLogger: Logger = {
  info: (): void => undefined,
  warn: (): void => undefined,
  trace: (): void => undefined,
  error: (): void => undefined,
  debug: (): void => undefined,
};
