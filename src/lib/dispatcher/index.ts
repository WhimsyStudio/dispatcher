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
 * @description
 */
class Processor<InputEvents extends EventsMap, OutputEvents extends EventsMap> {
  private readonly worker!: Worker;
  private handlers: Record<string | symbol, PureFunction> = {};

  /**
   * @param worker
   */
  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (ev: MessageEvent<Message>) => {
      this.handlers[ev.data.ev].call(
        this.worker,
        ev.data.payload,
        (...args: any[]) => {
          this.worker.postMessage({ ev: args[0], payload: args[1] });
        },
      );
    };
  }

  /**
   * @description
   * @param ev
   * @param listener
   */
  on<Ev extends UserEventNames<InputEvents>>(
    ev: Ev,
    listener: Callback<
      UserListener<InputEvents, Ev>,
      <Ev extends EventNames<OutputEvents>>(
        ev: Ev,
        ...arg: EventParams<OutputEvents, Ev>
      ) => void
    >,
  ): void {
    this.handlers[ev] = listener;
  }
}

/**
 * @description
 */
class Initiator<InputEvents extends EventsMap, OutputEvents extends EventsMap> {
  private readonly worker!: Worker;
  private handlers: Record<string | symbol, PureFunction> = {};

  /**
   * @param worker
   */
  constructor(worker: string | URL | Worker) {
    if (worker instanceof Worker) {
      this.worker = worker;
    } else {
      this.worker = new Worker(worker);
    }
    this.worker.onmessage = (ev: MessageEvent<Message>) => {
      this.handlers[ev.data.ev].call(this.worker, ev.data.payload);
    };
  }

  /**
   * @description
   * @param func
   * @param args
   */
  asPromise<K extends KeysOfType<OutputEvents>>(
    func: K,
    args: InferParams<OutputEvents, K>,
  ): OutputEvents[K] extends PureFunction
    ? PromiseWrapper<ReturnType<OutputEvents[K]>>
    : never {
    return new Promise((r, j) => {
      setTimeout(() => r('Gao'), 1000);
    }) as any;
  }

  /**
   * @description
   * @param ev
   * @param listener
   */
  subscribe<Ev extends UserEventNames<InputEvents>>(
    ev: Ev,
    listener: UserListener<InputEvents, Ev>,
  ) {
    this.handlers[ev] = listener;
  }

  /**
   * @description
   * @param ev
   * @param arg
   */
  emit<Ev extends EventNames<OutputEvents>>(
    ev: Ev,
    ...arg: EventParams<OutputEvents, Ev>
  ): void {
    this.worker.postMessage({ ev, payload: arg });
  }
}

export { Processor, Initiator };
