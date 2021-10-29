export function errorAsString(err: unknown): string {
  return err instanceof Error ? (err as Error).message : JSON.stringify(err);
}
