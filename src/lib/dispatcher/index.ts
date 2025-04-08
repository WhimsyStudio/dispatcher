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
  ? (...args: [...P, Callback, number]) => void
  : never;

type KeysOfType<T> = keyof T;

type WorkerInstance<Modules extends { [key: string | symbol]: any }> =
  typeof globalThis & Modules;

/**
 * @description Data model for MessageEvent in web worker.
 */
type Message = {
  /**
   * @description Event Name
   */
  ev: string | symbol;
  /**
   * @description Parameter
   */
  payload: any;
  /**
   * @description Channel ID
   */
  channel?: number;
};

/**
 * @description Works in web worker for process request from Provider.
 */
class Processor<InputEvents extends EventsMap, OutputEvents extends EventsMap> {
  private readonly worker!: Worker;
  private handlers: Record<string | symbol, PureFunction> = {};

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (ev: MessageEvent<Message>) => {
      if (ev.data.ev === 'RUN') {
        (async function () {}).constructor(ev.data.payload.funcStr)(
          ev.data.payload.args,
        );
        return;
      }
      this.handlers[ev.data.ev].call(
        this.worker,
        Array.isArray(ev.data.payload) ? ev.data.payload[0] : ev.data.payload,
        (...args: any[]) => {
          this.worker.postMessage({
            ev: args[0],
            payload: args[1],
            channel: args[2],
          });
        },
        ev.data.channel,
      );
    };
  }

  /**
   * @description Setup listener for handling response from Initiator.
   */
  on<Ev extends UserEventNames<InputEvents>>(
    ev: Ev,
    listener: Callback<
      UserListener<InputEvents, Ev>,
      <Ev extends EventNames<OutputEvents>>(
        ev: Ev,
        ...arg: [...EventParams<OutputEvents, Ev>, undefined | number]
      ) => void
    >,
  ): void {
    this.handlers[ev] = listener;
  }
}

class TaskCancellationError extends Error {}
class TaskTimeoutError extends Error {}

type ExtraReturnFields = { cancel: () => void };
/**
 * @description Works in main javascript thread as callee.
 */
class Provider<InputEvents extends EventsMap, OutputEvents extends EventsMap> {
  private readonly worker!: Worker;
  private handlers: Record<string | symbol, PureFunction> = {};
  private runHandlers: Record<
    string | symbol,
    { reject: Function; resolve: Function }
  > = {};
  private promiseHandlers: Record<number, PureFunction> = {};

  constructor(worker: string | URL | Worker) {
    if (worker instanceof Worker) {
      this.worker = worker;
    } else {
      this.worker = new Worker(worker);
    }
    this.worker.onmessage = (ev: MessageEvent<Message>) => {
      if (ev.data.ev === 'RUN_RES' && ev.data.channel !== undefined) {
        const handler = this.runHandlers[ev.data.channel];
        handler.resolve(ev.data.payload);
        return;
      }
      if (ev.data.channel !== undefined) {
        this.promiseHandlers[ev.data.channel].call(
          this.worker,
          ev.data.payload,
        );
      } else {
        this.handlers[ev.data.ev].call(this.worker, ev.data.payload);
      }
    };
  }

  /**
   * @description Call method in Processor in promise-like way.
   * @param ev Event to be fired
   * @param arg Execute Arguments
   */
  commit<K extends KeysOfType<OutputEvents>>(
    ev: K,
    arg: InferParams<OutputEvents, K>,
  ): OutputEvents[K] extends PureFunction
    ? PromiseWrapper<ReturnType<OutputEvents[K]>>
    : never {
    let channel = Math.max(Object.keys(this.promiseHandlers).length, 0);
    channel = !channel ? channel : channel + 1;
    return new Promise((r, _j) => {
      this.promiseHandlers[channel] = r;
      this.worker.postMessage({ ev: ev, payload: arg, channel });
    }) as any;
  }

  /**
   * @description Setup listener for request from Processor.
   * @param ev Event to be fired
   * @param listener Callback for event
   */
  on<Ev extends UserEventNames<InputEvents>>(
    ev: Ev,
    listener: UserListener<InputEvents, Ev>,
  ) {
    this.handlers[ev] = listener;
  }

  /**
   * @description Send request to Processor.
   * @param ev Event to be fired
   * @param arg Execute Arguments
   */
  emit<Ev extends EventNames<OutputEvents>>(
    ev: Ev,
    ...arg: EventParams<OutputEvents, Ev>
  ): void {
    this.worker.postMessage({ ev, payload: arg });
  }

  /**
   * @description Run function in webworker.
   * @param task Function Prototype
   * @param params Function Parameters
   * @param opts  Runing Options
   */
  run<T, D extends Readonly<[...any]>>(
    func: (
      ...params: {
        [i in keyof D]: Awaited<D[i]> extends unknown
          ? Awaited<D[i]>
          : Awaited<D[i]>;
      } & Array<any>
    ) => T,
    params?: Readonly<[...D]>,
    opts?: { executionTimeoutMs?: number },
  ): Promise<T> & ExtraReturnFields {
    let capturedReject: undefined | ((e: unknown) => void);
    const promise: Promise<T> & Partial<ExtraReturnFields> = new Promise(
      async (resolve, reject) => {
        try {
          capturedReject = reject;
          const awaitedDeps = await Promise.all(params ?? []);
          const args = awaitedDeps.map((d) => {
            return d;
          });
          let channel = Math.max(Object.keys(this.runHandlers).length, 0);
          channel = !channel ? channel : channel + 1;
          this.runHandlers[channel] = { reject, resolve };
          const funcStr = `Promise.all(arguments[0]).then(deps => (${func.toString()})(...deps)).then(r=>postMessage({ev:'RUN_RES',payload:r,channel:${channel}})).catch(e=>postMessage({$__error:e}))`;

          if (opts?.executionTimeoutMs != null) {
            setTimeout(
              () =>
                reject(
                  new TaskTimeoutError(
                    `Task exceeded ${opts.executionTimeoutMs}ms`,
                  ),
                ),
              opts.executionTimeoutMs,
            );
          }

          this.worker.postMessage({
            ev: 'RUN',
            payload: { funcStr, args },
            channel,
          });
        } catch (e) {
          reject(e);
        }
      },
    );

    promise.cancel = () => {
      capturedReject?.(new TaskCancellationError('Task cancelled'));
    };

    return promise as Promise<T> & ExtraReturnFields;
  }
}

export type {
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
  WorkerInstance,
  Message,
};

export { Processor, Provider };

