import {
  Callback,
  EventNames,
  EventParams,
  EventsMap,
  InferParams,
  KeysOfType,
  PromiseWrapper,
  PureFunction,
  UserEventNames,
  UserListener,
} from './typings';
import { Message } from '@wsys/dispatcher/model';

/**
 * @description Works in web worker for process request from Initiator.
 */
class Processor<InputEvents extends EventsMap, OutputEvents extends EventsMap> {
  private readonly worker!: Worker;
  private handlers: Record<string | symbol, PureFunction> = {};

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (ev: MessageEvent<Message>) => {
      this.handlers[ev.data.ev].call(
        this.worker,
        ev.data.payload,
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

/**
 * @description Works in main javascript thread as callee.
 */
class Initiator<InputEvents extends EventsMap, OutputEvents extends EventsMap> {
  private readonly worker!: Worker;
  private handlers: Record<string | symbol, PureFunction> = {};
  private promiseHandlers: Record<number, PureFunction> = {};

  constructor(worker: string | URL | Worker) {
    if (worker instanceof Worker) {
      this.worker = worker;
    } else {
      this.worker = new Worker(worker);
    }
    this.worker.onmessage = (ev: MessageEvent<Message>) => {
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
   * @description
   */
  asPromise<K extends KeysOfType<OutputEvents>>(
    func: K,
    args: InferParams<OutputEvents, K>,
  ): OutputEvents[K] extends PureFunction
    ? PromiseWrapper<ReturnType<OutputEvents[K]>>
    : never {
    let id = Math.max(Object.keys(this.promiseHandlers).length, 0);
    id = !id ? id : id + 1;
    return new Promise((r, _j) => {
      this.promiseHandlers[id] = r;
      this.worker.postMessage({ ev: func, payload: args, id });
    }) as any;
  }

  /**
   * @description
   */
  on<Ev extends UserEventNames<InputEvents>>(
    ev: Ev,
    listener: UserListener<InputEvents, Ev>,
  ) {
    this.handlers[ev] = listener;
  }

  /**
   * @description
   */
  emit<Ev extends EventNames<OutputEvents>>(
    ev: Ev,
    ...arg: EventParams<OutputEvents, Ev>
  ): void {
    this.worker.postMessage({ ev, payload: arg });
  }
}

export { Processor, Initiator };
