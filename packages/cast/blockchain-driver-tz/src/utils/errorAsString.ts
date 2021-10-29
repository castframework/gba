export function errorAsString(err: unknown): string {
  return err instanceof Error ? (err as Error).message : JSON.stringify(err);
}

export function getTezosErrorMessage(error: any): string {
  return error.message != undefined && error.message.startsWith('(')
    ? errorAsString(error)
    : error.message;
}
