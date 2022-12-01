export type ViewMapper<StorageType, ReturnType> = (
  storage: StorageType,
  methodParameters: unknown[],
) => Promise<ReturnType>;

export type ViewMappers<StorageType> = Record<
  string,
  ViewMapper<StorageType, unknown>
>;

export type EventMapper<EventType> = (
  method: string,
  methodParameters: unknown,
) => EventType;

export type EventMappers = Record<string, EventMapper<unknown>>;

export class TezosSpecificParams {
  viewMappers?: ViewMappers<unknown>;
  eventMappers?: EventMappers;
}
