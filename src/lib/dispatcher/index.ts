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

  constructor(private workerScriptUrl: string) {
    // this.worker = new Worker(workerScriptUrl);
    // Process OutputEvents, turn all to promise-like functions
  }

  asPromise<K extends KeysOfType<OutputEvents>>(
    methodName: K,
    args: InferParams<OutputEvents, K>,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
  ): OutputEvents[K] extends PureFunction
    ? PromiseWrapper<ReturnType<OutputEvents[K]>>
    : never {
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

/** Testing Sample **/
type InputEvents = {
  COMBINE_MESSAGE: (name: { name: string }) => void;
  DOUBLE_NUMBER: (a: number) => void;
  RESERVE_STRING: (data: { str: string }) => void;
  BEGIN_COUNT: () => void;
  INIT_CANVAS: (params: {
    canvas: OffscreenCanvas;
    transfer: Transferable[];
  }) => void;
  DRAW_RECT: (params: { width: number; height: number; color: string }) => void;
};

type OutputEvents = {
  COMBINED_MESSAGE: (message: string) => void;
  DOUBLED_NUMBER: (res: number) => number;
  RESERVED_STRING: (res: { str: string }) => string;
  SEND_COUNT: (count: number) => void;
};
/**  Processor & Initiator initialize  **/
const initiator = new Initiator<InputEvents, OutputEvents>('');
initiator.asPromise('RESERVED_STRING', { str: 'Jack' }).then((res) => {
  console.log(res);
});
initiator.asPromise('DOUBLED_NUMBER', 10).then((n) => {
  console.log(n);
});
initiator.subscribe('COMBINE_MESSAGE', (res) => {
  console.log(res);
});
initiator.emit('DOUBLED_NUMBER', 20);
const processor = new Processor<InputEvents, OutputEvents>();
processor.on('COMBINE_MESSAGE', (req, emit) => {
  console.log(req);
  emit('COMBINED_MESSAGE', 'lee');
});
export { Processor, Initiator };
