/** Typing Definition **/
export type EventsMap = {
  [key: string | number | symbol]: (arg: any) => void;
};

export type EventNames<Map extends EventsMap> = keyof Map & (string | symbol);

export type EventParams<
  Map extends EventsMap,
  Ev extends EventNames<Map>,
> = Parameters<Map[Ev]>;

export type UserEventNames<UserEvents extends EventsMap> =
  EventNames<UserEvents>;

export type UserListener<
  UserEvents extends EventsMap,
  Ev extends keyof UserEvents,
> = UserEvents[Ev];

export type PromiseWrapper<Value> =
  Value extends Promise<any> ? Value : Promise<Value>;

export type PureFunction = (...args: never[]) => never | void;

export type InferParams<E extends EventsMap, K extends keyof EventsMap> =
  Parameters<E[K]> extends Array<any> ? Parameters<E[K]>[0] : never;
type AppendCallback<
  T extends (...args: any[]) => any,
  Callback extends (...args: any[]) => any,
> = T extends (...args: infer P) => infer R
  ? (...args: [...P, Callback]) => R
  : never;

/** Core Definition **/
/**
 * @description
 */
class Processor<InputEvents extends EventsMap, OutputEvents extends EventsMap> {
  private worker!: Worker;

  constructor() {
    // this.worker = worker;
  }

  /**
   * @description
   * @param ev
   * @param listener
   */
  on<Ev extends UserEventNames<InputEvents>>(
    ev: Ev,
    listener: AppendCallback<
      UserListener<InputEvents, Ev>,
      <Ev extends EventNames<OutputEvents>>(
        ev: Ev,
        ...arg: EventParams<OutputEvents, Ev>
      ) => void
    >,
  ): void {}
}

type KeysOfType<T> = keyof T;

/**
 * @description
 */
class Initiator<InputEvents extends EventsMap, OutputEvents extends EventsMap> {
  private worker!: Worker;
  private methods: {
    [K in keyof OutputEvents]?: (...args: InferParams<OutputEvents, K>) => any;
  } = {};

  constructor(worker: string | URL | Worker) {
    if (worker instanceof Worker) {
      this.worker = worker;
    } else {
      this.worker = new Worker(worker);
    }
    // Process OutputEvents, turn all to promise-like functions
  }

  asPromise<K extends KeysOfType<OutputEvents>>(
    methodName: K,
    args: InferParams<OutputEvents, K>,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  ): OutputEvents[K] extends PureFunction
    ? PromiseWrapper<ReturnType<OutputEvents[K]>>
    : never {
    return new Promise((r, j) => {
      setTimeout(() => r('Gao'), 1000);
    }) as any;
    // const method = this.methods[methodName];
    // if (method) {
    //   return method(args);
    // } else {
    //   throw new Error(`Method ${String(methodName)} does not exist.`);
    // }
  }

  /**
   * @description
   * @param ev
   * @param listener
   */
  subscribe<Ev extends UserEventNames<InputEvents>>(
    ev: Ev,
    listener: UserListener<InputEvents, Ev>,
  ) {}

  /**
   * @description
   * @param ev
   * @param arg
   */
  emit<Ev extends EventNames<OutputEvents>>(
    ev: Ev,
    ...arg: EventParams<OutputEvents, Ev>
  ): void {
    // this.worker.postMessage(ev, arg);
  }
}

export { Processor, Initiator };
