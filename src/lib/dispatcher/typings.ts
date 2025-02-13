type EventsMap = {
  [key: string | number | symbol]: (arg: any) => void;
};

type EventNames<Map extends EventsMap> = keyof Map & (string | symbol);

type EventParams<
  Map extends EventsMap,
  Ev extends EventNames<Map>,
> = Parameters<Map[Ev]>;

type UserEventNames<UserEvents extends EventsMap> = EventNames<UserEvents>;

type UserListener<
  UserEvents extends EventsMap,
  Ev extends keyof UserEvents,
> = UserEvents[Ev];

type PromiseWrapper<Value> =
  Value extends Promise<any> ? Value : Promise<Value>;

type PureFunction = (...args: never[]) => never | void;

type InferParams<E extends EventsMap, K extends keyof EventsMap> =
  Parameters<E[K]> extends Array<any> ? Parameters<E[K]>[0] : never;

type Callback<
  T extends (...args: any[]) => any,
  Callback extends (...args: any[]) => any,
> = T extends (...args: infer P) => void
  ? (...args: [...P, Callback]) => void
  : never;

type KeysOfType<T> = keyof T;

export {
  EventsMap,
  EventNames,
  EventParams,
  UserEventNames,
  UserListener,
  PromiseWrapper,
  PureFunction,
  InferParams,
  Callback,
  KeysOfType,
};
