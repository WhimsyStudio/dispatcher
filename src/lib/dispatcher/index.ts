type Task<T> = {
  future: Promise<T>;
  cancel: () => void;
};

type EventCallback<
  T extends (...args: any[]) => any,
  Callback extends (...args: any[]) => any
> = T extends (...args: infer P) => void
  ? (...args: [...P, Callback, number]) => void
  : never;

type EventPayload = {
  ev: string | symbol;
  payload: any;
  channel?: number;
};

/**
 * @description Map-like for defining events passed between main and web worker
 */
type EventMap = {
  [key: string | symbol]: (arg: any) => void;
};

/**
 * @description Utility type for defining extra attributes in web worker
 */
type ExtWorker<ExtraAttrs extends { [key: string | symbol]: any }> =
  typeof globalThis & Worker & ExtraAttrs;

/**
 * @description Provider instance which can communicate with web worker processor
 */
type ProviderWorker<I extends EventMap, O extends EventMap> = Provider<I, O> & {
  [K in keyof O]: O[K] extends (...args: any[]) => any
    ? (...args: Parameters<O[K]>) => Promise<ReturnType<O[K]>>
    : never;
};

class TaskTimeoutError extends Error {}

/**
 * @description Works in web worker for process request from Provider.
 */
class Processor<InputEvents extends EventMap, OutputEvents extends EventMap> {
  private readonly worker: Worker = (self || globalThis) as unknown as Worker;
  private handlers: Record<string | symbol, Function> = {};

  constructor() {
    this.worker.onmessage = (ev: MessageEvent<EventPayload>) => {
      if (ev.data.ev === "RUN") {
        (async function () {}).constructor(ev.data.payload.funcStr)(
          ev.data.payload.args
        );
        return;
      }
      const emit = (...args: any[]) => {
        if (args.length === 3) {
          this.worker.postMessage({
            ev: args[0],
            payload: args[1],
            channel: args[2],
          });
        } else {
          this.worker.postMessage({
            ev: args[0],
            payload: undefined,
            channel: args[1],
          });
        }
      };
      if (ev.data.payload) {
        this.handlers[ev.data.ev].call(
          this.worker,
          Array.isArray(ev.data.payload) ? ev.data.payload[0] : ev.data.payload,
          emit,
          ev.data.channel
        );
      } else {
        this.handlers[ev.data.ev].call(this.worker, emit, ev.data.channel);
      }
    };
  }

  /**
   * @description Setup listener for handling response from Initiator.
   */
  on<Ev extends keyof InputEvents & (string | symbol)>(
    ev: Ev,
    listener: EventCallback<
      InputEvents[Ev],
      <Ev extends keyof OutputEvents & (string | symbol)>(
        ev: Ev,
        ...arg: [...Parameters<OutputEvents[Ev]>, undefined | number]
      ) => void
    >
  ): void {
    this.handlers[ev] = listener;
  }
}
/**
 * @description Works in main javascript thread as callee.
 */
class Provider<InputEvents extends EventMap, OutputEvents extends EventMap> {
  private readonly worker!: Worker;
  private handlers: Record<string | symbol, Function> = {};
  private runHandlers: Record<
    string | symbol,
    { reject: Function; resolve: Function }
  > = {};
  private promiseHandlers: Record<number, Function> = {};

  static create<InputEvents extends EventMap, OutputEvents extends EventMap>(
    worker: string | URL | Worker
  ): ProviderWorker<InputEvents, OutputEvents> {
    const base = new Provider<InputEvents, OutputEvents>(worker);

    return new Proxy(base, {
      get(target, key, receiver) {
        if (typeof key === "string" && key in target === false) {
          return (...args: any[]) =>
            target.commit(key as keyof OutputEvents, args[0]).future;
        }
        return Reflect.get(target, key, receiver);
      },
    }) as any;
  }

  private constructor(worker: string | URL | Worker) {
    if (worker instanceof Worker) {
      this.worker = worker;
    } else {
      this.worker = new Worker(worker);
    }
    this.worker.onmessage = (ev: MessageEvent<EventPayload>) => {
      if (ev.data.ev === "RUN_RES" && ev.data.channel !== undefined) {
        const handler = this.runHandlers[ev.data.channel];
        handler.resolve(ev.data.payload);
        return;
      }
      if (ev.data.channel !== undefined) {
        this.promiseHandlers[ev.data.channel].call(
          this.worker,
          ev.data.payload
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
  commit<K extends keyof OutputEvents>(
    ev: K,
    arg?: Parameters<OutputEvents[K]> extends Array<any>
      ? Parameters<OutputEvents[K]>[0]
      : never,
    opts?: { timeout?: number }
  ): OutputEvents[K] extends Function
    ? Task<ReturnType<OutputEvents[K]>>
    : never {
    let channel = Math.max(Object.keys(this.promiseHandlers).length, 0);
    channel = !channel ? channel : channel + 1;
    const future = new Promise((r, j) => {
      this.promiseHandlers[channel] = r;
      this.worker.postMessage({ ev: ev, payload: arg, channel });
      if (opts && opts.timeout) {
        setTimeout(() => {
          j(new TaskTimeoutError(`Task exceeded ${opts.timeout}ms`));
        }, opts.timeout);
      }
    });
    return { future, cancel: () => {} } as any;
  }

  /**
   * @description Setup listener for request from Processor.
   * @param ev Event to be fired
   * @param listener Callback for event
   */
  on<Ev extends keyof InputEvents & (string | symbol)>(
    ev: Ev,
    listener: InputEvents[Ev]
  ) {
    this.handlers[ev] = listener;
  }

  /**
   * @description Send request to Processor.
   * @param ev Event to be fired
   * @param arg Execute Arguments
   */
  emit<Ev extends keyof OutputEvents & (string | symbol)>(
    ev: Ev,
    arg: Parameters<OutputEvents[Ev]>
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
    opts?: { timeout?: number }
  ): Task<T> {
    // eslint-disable-next-line no-async-promise-executor
    const promise: Promise<T> = new Promise(async (resolve, reject) => {
      try {
        const awaitedDeps = await Promise.all(params ?? []);
        const args = awaitedDeps.map((d) => {
          return d;
        });
        let channel = Math.max(Object.keys(this.runHandlers).length, 0);
        channel = !channel ? channel : channel + 1;
        this.runHandlers[channel] = { reject, resolve };
        const funcStr = `Promise.all(arguments[0]).then(deps => (${func.toString()})(...deps)).then(r=>postMessage({ev:'RUN_RES',payload:r,channel:${channel}})).catch(e=>postMessage({$__error:e}))`;

        if (opts?.timeout != null) {
          setTimeout(
            () =>
              reject(new TaskTimeoutError(`Task exceeded ${opts.timeout}ms`)),
            opts.timeout
          );
        }

        this.worker.postMessage({
          ev: "RUN",
          payload: { funcStr, args },
          channel,
        });
      } catch (e) {
        reject(e);
      }
    });
    return { future: promise as Promise<T>, cancel: () => {} };
  }
}

export type { EventMap, ExtWorker, Task, ProviderWorker };
export { Processor, Provider };
