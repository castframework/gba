export type ViewMapper<StorageType, ReturnType> = (
  storage: StorageType,
  methodParameters: unknown[],
) => Promise<ReturnType>;

export type ViewMappers<StorageType> = Record<
  string,
  ViewMapper<StorageType, unknown>
>;

export type EventMapper<MethodParamTypes extends Array<unknown>, EventType> = (
  method: string,
  methodParameters: MethodParamTypes,
) => EventType;

export type EventMappers = Record<string, EventMapper<unknown[], unknown>>;

export class TezosSpecificParams {
  eventSinkProperty?: string;
  viewMappers?: ViewMappers<unknown>;
  eventMappers?: EventMappers;
}
