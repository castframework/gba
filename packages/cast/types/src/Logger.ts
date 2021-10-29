export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  trace(message: string): void;
  error(message: string, trace?: string): void;
  debug(message: string): void;
}
