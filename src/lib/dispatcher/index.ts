/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Represents an asynchronous worker operation that cannot be cancelled.
 *
 * `future` settles with the operation's result or rejects if the operation,
 * worker, or configured timeout fails.
 *
 * @typeParam T - The value produced when the operation succeeds.
 */
type UncancelableTask<T> = {
  /** Resolves to the operation's result or rejects if it fails. */
  future: Promise<T>
}

/**
 * Represents an asynchronous worker operation that can be cancelled.
 *
 * Cancelling rejects the local task and notifies the worker so its registered
 * cancellation callback can clean up worker-side work.
 *
 * @typeParam T - The value produced when the operation succeeds.
 */
type Task<T> = UncancelableTask<T> & {
  /**
   * Rejects this task immediately and notifies the worker to run any
   * cancellation callback registered for its request.
   */
  cancel: () => void
}

/**
 * Receives an error reported by a worker or by a request sent to a worker.
 *
 * @param error - The normalized error.
 * @param channel - The request channel, when the error belongs to a request.
 */
type ErrorCallback = (error: Error, channel?: number) => void

/**
 * Receives an error thrown by a processor event handler.
 *
 * @param error - The thrown value; it is `unknown` because JavaScript allows
 * handlers to throw values other than `Error` instances.
 */
type ProcessorErrorCallback = (error: unknown) => void

/**
 * Registers a callback to run if the current processor request is cancelled.
 *
 * The callback is associated with the request's channel and is invoked at most
 * once. If cancellation has already arrived, it runs immediately.
 *
 * @param callback - Worker-side cleanup to run when the request is cancelled.
 */
type OnCancelCallback = (callback: () => void) => void

/**
 * Describes the callback signature accepted by {@link Processor.on}.
 *
 * The callback receives the input event's parameters first, followed by an
 * `emit` function for sending output events, an error callback, the optional
 * request channel, and an `onCancel` function for registering worker-side
 * cancellation cleanup.
 *
 * @typeParam T - The input event handler signature.
 * @typeParam Callback - The callback used to emit output events.
 */
type EventCallback<
  T extends (...args: any[]) => any,
  Callback extends (...args: any[]) => any,
> = T extends (...args: infer P) => void
  ? (
      ...args: [...P, Callback, ProcessorErrorCallback, number | undefined, OnCancelCallback]
    ) => void
  : never

/**
 * The structured-clone-safe error shape used to transfer errors between
 * the worker and the calling thread.
 */
type SerializedError = {
  name: string
  message: string
  stack?: string
}

/**
 * The envelope used by the dispatcher to transport an event and its payload.
 *
 * `channel` is present for request/response messages and omitted for
 * notifications that do not expect a result.
 */
type EventPayload = {
  ev: string | symbol
  payload: unknown
  channel?: number
}

/**
 * Maps event names to their handler signatures.
 *
 * Use a separate map for each direction: input events handled by
 * {@link Processor}, and output events sent through {@link Provider}.
 */
type EventMap = {
  [key: string | symbol]: (arg: any) => void
}

/**
 * Describes a worker global scope augmented with application-specific
 * properties.
 *
 * @typeParam ExtraAttrs - Additional properties available on the worker.
 */
type ExtWorker<ExtraAttrs extends { [key: string | symbol]: any }> = typeof globalThis &
  Worker &
  ExtraAttrs

/**
 * The provider API augmented with one promise-returning method for each output
 * event. Each generated method sends its first argument as the event payload.
 *
 * @typeParam I - Events received from the worker.
 * @typeParam O - Events sent to the worker and exposed as generated methods.
 */
type ProviderWorker<I extends EventMap, O extends EventMap> = Provider<I, O> & {
  [K in keyof O]: O[K] extends (...args: any[]) => any
    ? (...args: Parameters<O[K]>) => Promise<ReturnType<O[K]>>
    : never
}

/** Tracks the callbacks and optional timer for one in-flight request. */
type PendingRequest = {
  reject: (error: Error) => void
  resolve: (value: unknown) => void
  timeoutId?: ReturnType<typeof setTimeout>
}

/** Tracks cancellation handlers registered for one processor request. */
type ActiveRequest = {
  cancelled: boolean
  completed: boolean
  callbacks: Set<() => void>
}

const ERROR_EVENT = '__DISPATCHER_ERROR__'
const CANCEL_EVENT = '__DISPATCHER_CANCEL__'
const CANCEL_ACK_EVENT = '__DISPATCHER_CANCEL_ACK__'
const RUN_EVENT = 'RUN'
const RUN_RESULT_EVENT = 'RUN_RES'

/**
 * Error used when a request's configured timeout expires before it completes.
 */
class TaskTimeoutError extends Error {
  /**
   * Creates a timeout error.
   *
   * @param message - A description of the timeout.
   */
  constructor(message: string) {
    super(message)
    this.name = 'TaskTimeoutError'
  }
}

function serializeError(value: unknown): SerializedError {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(value.stack ? { stack: value.stack } : {}),
    }
  }

  return {
    name: 'Error',
    message: typeof value === 'string' ? value : String(value),
  }
}

function deserializeError(value: unknown): Error {
  if (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  ) {
    const error = new Error(value.message)
    if ('name' in value && typeof value.name === 'string') error.name = value.name
    if ('stack' in value && typeof value.stack === 'string') error.stack = value.stack
    return error
  }

  return new Error(typeof value === 'string' ? value : 'Unknown error from worker')
}

/**
 * Runs on the worker side and dispatches incoming events to registered
 * handlers.
 *
 * A processor installs the worker's message and error listeners when it is
 * constructed. Register handlers with {@link Processor.on} before the
 * provider sends corresponding events.
 *
 * @typeParam InputEvents - Events received from the provider.
 * @typeParam OutputEvents - Events that processor handlers may emit.
 *
 * @example
 * ```ts
 * type Inputs = { double: (value: number) => void };
 * type Outputs = { result: (value: number) => void };
 *
 * const processor = new Processor<Inputs, Outputs>();
 * processor.on('double', (value, emit) => emit('result', value * 2));
 * ```
 */
class Processor<InputEvents extends EventMap, OutputEvents extends EventMap> {
  private readonly worker: Worker = globalThis as unknown as Worker
  private readonly handlers: Record<string | symbol, Function> = {}
  private readonly activeRequests = new Map<number, ActiveRequest>()

  constructor() {
    this.worker.onmessage = (event: MessageEvent<EventPayload>) => {
      const { ev, payload, channel } = event.data
      if (ev === CANCEL_EVENT) {
        if (channel !== undefined) {
          this.cancelRequest(channel)
          this.worker.postMessage({ ev: CANCEL_ACK_EVENT, channel })
        }
        return
      }

      if (ev === RUN_EVENT) {
        this.handleRun(payload, channel)
        return
      }

      const handler = this.handlers[ev]
      if (!handler) {
        this.postError(new Error(`No processor handler registered for "${String(ev)}"`), channel)
        return
      }

      const request: ActiveRequest = {
        cancelled: false,
        completed: channel === undefined,
        callbacks: new Set(),
      }
      if (channel !== undefined) this.activeRequests.set(channel, request)
      const emit = (...args: any[]) => {
        const [outputEvent, outputPayload, outputChannel] = args
        const responseChannel = args.length === 2 ? outputPayload : outputChannel
        if (request.cancelled && responseChannel === channel) return
        this.worker.postMessage({
          ev: outputEvent,
          payload: args.length === 2 ? undefined : outputPayload,
          channel: responseChannel,
        })
        if (channel !== undefined && responseChannel === channel) {
          this.completeRequest(channel, request)
        }
      }
      const onError: ProcessorErrorCallback = (error) => {
        this.completeRequest(channel, request)
        this.postError(error, channel)
      }
      const onCancel: OnCancelCallback = (callback) => {
        if (request.cancelled) {
          this.runCancelCallback(callback)
        } else if (!request.completed) {
          request.callbacks.add(callback)
        }
      }

      try {
        const result =
          payload === undefined
            ? handler.call(this.worker, emit, onError, channel, onCancel)
            : handler.call(
                this.worker,
                Array.isArray(payload) ? payload[0] : payload,
                emit,
                onError,
                channel,
                onCancel,
              )
        void Promise.resolve(result).catch((error: unknown) => {
          this.completeRequest(channel, request)
          this.postError(error, channel)
        })
      } catch (error) {
        this.completeRequest(channel, request)
        this.postError(error, channel)
      }
    }

    this.worker.addEventListener('error', (event) => {
      this.postError(event.error ?? new Error(event.message))
    })
    this.worker.addEventListener('unhandledrejection', (event) => {
      this.postError((event as PromiseRejectionEvent).reason)
    })
  }

  /**
   * Registers or replaces the handler for an input event.
   *
   * The handler receives the event's declared parameters, then an `emit`
   * callback, an error callback, the optional request channel, and an
   * `onCancel` function. Register cleanup with `onCancel(callback)`; it runs
   * if the matching {@link Provider.commit} task is cancelled. Pass the
   * channel to `emit` when responding to a request. The registration function
   * is ignored for notifications without a request channel.
   *
   * @typeParam Ev - The input event name.
   * @param ev - The event name to handle.
   * @param listener - The function invoked when the event arrives.
   */
  on<Ev extends keyof InputEvents & (string | symbol)>(
    ev: Ev,
    listener: EventCallback<
      InputEvents[Ev],
      <Ev extends keyof OutputEvents & (string | symbol)>(
        ev: Ev,
        ...arg: [...Parameters<OutputEvents[Ev]>, undefined | number]
      ) => void
    >,
  ): void {
    this.handlers[ev] = listener
  }

  private cancelRequest(channel: number): void {
    const request = this.activeRequests.get(channel)
    if (!request || request.completed || request.cancelled) return

    request.cancelled = true
    request.callbacks.forEach((callback) => this.runCancelCallback(callback))
    request.callbacks.clear()
    this.activeRequests.delete(channel)
  }

  private runCancelCallback(callback: () => void): void {
    try {
      callback()
    } catch (error) {
      this.postError(error)
    }
  }

  private completeRequest(channel: number | undefined, request: ActiveRequest): void {
    if (request.completed) return
    request.completed = true
    request.callbacks.clear()
    if (channel !== undefined && this.activeRequests.get(channel) === request) {
      this.activeRequests.delete(channel)
    }
  }

  private handleRun(payload: unknown, channel?: number): void {
    if (channel === undefined) {
      this.postError(new Error('Worker run request is missing its response channel'))
      return
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('funcStr' in payload) ||
      typeof payload.funcStr !== 'string' ||
      !('args' in payload) ||
      !Array.isArray(payload.args)
    ) {
      this.postError(new Error('Invalid worker run request'), channel)
      return
    }

    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
      ...args: string[]
    ) => (...args: unknown[]) => Promise<unknown>
    const execute = new AsyncFunction('deps', `return await (${payload.funcStr})(...deps)`)

    void Promise.resolve(payload.args)
      .then((args) => execute(args))
      .then((result) => {
        this.worker.postMessage({ ev: RUN_RESULT_EVENT, payload: result, channel })
      })
      .catch((error: unknown) => this.postError(error, channel))
  }

  private postError(error: unknown, channel?: number): void {
    this.worker.postMessage({
      ev: ERROR_EVENT,
      payload: serializeError(error),
      ...(channel !== undefined ? { channel } : {}),
    })
  }
}

/**
 * Runs on the calling thread and manages communication with a worker.
 *
 * A provider sends output events, receives input events, correlates
 * request/response messages, and reports worker failures. Create instances
 * with {@link Provider.create}; the constructor is intentionally private.
 *
 * @typeParam InputEvents - Events received from the worker.
 * @typeParam OutputEvents - Events sent to the worker.
 */
class Provider<InputEvents extends EventMap, OutputEvents extends EventMap> {
  private readonly worker: Worker
  private readonly handlers: Record<string | symbol, Function[]> = {}
  private readonly pendingRequests = new Map<number, PendingRequest>()
  private readonly errorHandlers = new Set<ErrorCallback>()
  private readonly cancelledChannels = new Set<number>()
  private nextChannel = 0
  private workerFailure: Error | undefined
  private isTerminated = false

  /**
   * Creates a provider connected to a worker and exposes typed methods for
   * every output event. `InputEvents` describes events the worker sends to the
   * provider; `OutputEvents` describes events the provider sends to the worker.
   * The worker may be an existing `Worker` instance or a URL/string used to
   * construct one.
   *
   * Generated event methods send their first argument as the payload and
   * return a promise for the worker's response. Use {@link Provider.commit}
   * when timeout options or the task handle are needed.
   *
   * @typeParam InputEvents - Events received from the worker.
   * @typeParam OutputEvents - Events sent to the worker.
   * @param worker - A worker instance or the URL of a worker script.
   * @returns A provider with generated, promise-returning methods for
   * `OutputEvents`.
   */
  static create<InputEvents extends EventMap, OutputEvents extends EventMap>(
    worker: string | URL | Worker,
  ): ProviderWorker<InputEvents, OutputEvents> {
    const base = new Provider<InputEvents, OutputEvents>(worker)

    return new Proxy(base, {
      get(target, key, receiver) {
        if (typeof key === 'string' && key in target === false) {
          return (...args: any[]) => target.commit(key as keyof OutputEvents, args[0]).future
        }
        return Reflect.get(target, key, receiver)
      },
    }) as any
  }

  private constructor(worker: string | URL | Worker) {
    this.worker = worker instanceof Worker ? worker : new Worker(worker)
    this.worker.onmessage = (event: MessageEvent<EventPayload>) => {
      const { ev, payload, channel } = event.data
      if (ev === CANCEL_ACK_EVENT) {
        if (channel !== undefined) this.cancelledChannels.delete(channel)
        return
      }
      if (channel !== undefined && this.cancelledChannels.has(channel)) return

      if (ev === ERROR_EVENT) {
        const error = deserializeError(payload)
        if (channel !== undefined) {
          this.rejectPending(channel, error)
        } else {
          this.reportError(error)
        }
        return
      }

      if (channel !== undefined && (ev === RUN_RESULT_EVENT || this.pendingRequests.has(channel))) {
        this.resolvePending(channel, payload)
        return
      }

      this.handlers[ev]?.forEach((handler) => handler.call(this.worker, payload))
    }

    this.worker.onerror = (event) => {
      event.preventDefault()
      this.failWorker(new Error(event.message || 'Worker execution failed'))
    }
    this.worker.onmessageerror = () => {
      this.failWorker(new Error('Could not deserialize a message from the worker'))
    }
  }

  /**
   * Sends an output event and returns a handle for its response.
   *
   * The processor must emit a response using the channel supplied to its
   * handler. A rejected promise indicates a worker error, message-posting
   * failure, timeout, or cancellation. Calling `cancel()` rejects `future`
   * immediately with an `AbortError`, then sends a cancellation message so the
   * processor can invoke callbacks registered with `onCancel`.
   *
   * @typeParam K - The output event name.
   * @param ev - The event to send to the worker.
   * @param arg - The event payload, if the event takes an argument.
   * @param opts - Optional request settings.
   * @param opts.timeout - Maximum time to wait, in milliseconds, before the
   * request is rejected with {@link TaskTimeoutError}.
   * @returns A task whose `future` resolves to the event handler's response.
   */
  commit<K extends keyof OutputEvents>(
    ev: K,
    arg?: Parameters<OutputEvents[K]> extends Array<any> ? Parameters<OutputEvents[K]>[0] : never,
    opts?: { timeout?: number },
  ): OutputEvents[K] extends Function ? Task<ReturnType<OutputEvents[K]>> : never {
    if (this.workerFailure) {
      return { future: Promise.reject(this.workerFailure), cancel: () => {} } as any
    }

    let channel = -1
    const future = new Promise<unknown>((resolve, reject) => {
      channel = this.createPendingRequest(resolve, reject, opts?.timeout)
    })

    try {
      this.worker.postMessage({ ev, payload: arg, channel })
    } catch (error) {
      this.rejectPending(channel, this.toError(error))
    }

    return {
      future,
      cancel: () => this.cancelPending(channel, this.createAbortError()),
    } as any
  }

  /**
   * Registers a listener for an event emitted by the worker.
   *
   * Multiple listeners may be registered for the same event. They are invoked
   * with the event payload as their sole argument.
   *
   * @typeParam Ev - The input event name.
   * @param ev - The event to listen for.
   * @param listener - The callback invoked when that event arrives.
   */
  on<Ev extends keyof InputEvents & (string | symbol)>(ev: Ev, listener: InputEvents[Ev]): void {
    this.handlers[ev] = this.handlers[ev] || []
    this.handlers[ev].push(listener)
  }

  /**
   * Removes one previously registered listener for a worker event.
   *
   * If the listener is not registered for the event, this method has no
   * effect. Other listeners for the same event remain registered.
   *
   * @typeParam Ev - The input event name.
   * @param ev - The event to stop listening for.
   * @param listener - The exact callback previously passed to {@link Provider.on}.
   */
  off<Ev extends keyof InputEvents & (string | symbol)>(ev: Ev, listener: InputEvents[Ev]): void {
    const handlers = this.handlers[ev]
    if (!handlers) return
    const index = handlers.findIndex((handler) => handler === listener)
    if (index >= 0) handlers.splice(index, 1)
  }

  /**
   * Registers a callback for errors reported by the worker or its requests.
   *
   * Request-specific errors include their channel. Each callback is invoked
   * independently; an exception thrown by a callback is logged and does not
   * prevent other error callbacks from running.
   *
   * @param listener - The error callback to register.
   */
  onError(listener: ErrorCallback): void {
    this.errorHandlers.add(listener)
  }

  /**
   * Removes a previously registered worker error callback.
   *
   * @param listener - The exact callback previously passed to
   * {@link Provider.onError}.
   */
  offError(listener: ErrorCallback): void {
    this.errorHandlers.delete(listener)
  }

  /**
   * Stops the worker and rejects all outstanding requests.
   *
   * The operation is idempotent. Registered event and error listeners are
   * cleared, and future requests reject with the worker-terminated error.
   */
  terminate(): void {
    if (this.isTerminated) return

    this.isTerminated = true
    this.workerFailure ??= new Error('Worker has been terminated')
    for (const channel of this.pendingRequests.keys()) {
      const pending = this.removePending(channel)
      pending?.reject(this.workerFailure)
    }
    this.cancelledChannels.clear()
    for (const key of Object.keys(this.handlers)) {
      delete this.handlers[key]
    }
    this.errorHandlers.clear()
    this.worker.terminate()
  }

  /**
   * Sends an output event without creating a request/response task.
   *
   * Use this for notifications that do not need a result. Failures while
   * posting the message are reported to callbacks registered with
   * {@link Provider.onError}.
   *
   * @typeParam Ev - The output event name.
   * @param ev - The event to send to the worker.
   * @param arg - The event's argument tuple. The worker processor receives its
   * first value as the payload.
   */
  emit<Ev extends keyof OutputEvents & (string | symbol)>(
    ev: Ev,
    arg: Parameters<OutputEvents[Ev]>,
  ): void {
    try {
      this.worker.postMessage({ ev, payload: arg })
    } catch (error) {
      this.reportError(this.toError(error))
    }
  }

  /**
   * Executes a serializable function in the worker and returns its result.
   *
   * The function is reconstructed in the worker from its source text.
   * Variables captured from the calling scope are therefore unavailable;
   * pass required values in `params` instead. Promise-like parameters are
   * resolved before they are sent. The worker must have a compatible
   * JavaScript environment to evaluate the function.
   *
   * @typeParam T - The result type of the function.
   * @typeParam D - The tuple of values passed to the function.
   * @param func - The function whose source will be evaluated in the worker.
   * @param params - Values supplied as the function's arguments.
   * @param opts - Optional execution settings.
   * @param opts.timeout - Maximum time to wait, in milliseconds, before the
   * task is rejected with {@link TaskTimeoutError}.
   * @returns An un-cancelable task whose `future` resolves to the function's
   * result. Use {@link Provider.commit} when the operation needs cancellation
   * callbacks on the worker.
   *
   * @example
   * ```ts
   * const task = provider.run((value: number) => value * 2, [21]);
   * const result = await task.future; // 42
   * ```
   */
  run<T, D extends Readonly<[...any]>>(
    func: (
      ...params: {
        [i in keyof D]: Awaited<D[i]> extends unknown ? Awaited<D[i]> : Awaited<D[i]>
      } & Array<any>
    ) => T,
    params?: Readonly<[...D]>,
    opts?: { timeout?: number },
  ): UncancelableTask<T> {
    if (this.workerFailure) {
      return { future: Promise.reject(this.workerFailure) }
    }

    let channel = -1
    const future = new Promise<T>((resolve, reject) => {
      channel = this.createPendingRequest((value) => resolve(value as T), reject, opts?.timeout)
    })

    void Promise.all(params ?? [])
      .then((args) => {
        if (!this.pendingRequests.has(channel)) return
        const funcStr = func.toString()
        this.worker.postMessage({
          ev: RUN_EVENT,
          payload: { funcStr, args },
          channel,
        })
      })
      .catch((error: unknown) => this.rejectPending(channel, this.toError(error)))

    return { future }
  }

  private createPendingRequest(
    resolve: (value: unknown) => void,
    reject: (error: Error) => void,
    timeout?: number,
  ): number {
    // A unique channel links the eventual response (or error) to this promise.
    const channel = this.nextChannel++
    const pending: PendingRequest = {
      resolve,
      reject,
    }
    this.pendingRequests.set(channel, pending)

    if (timeout !== undefined) {
      pending.timeoutId = setTimeout(() => {
        this.cancelPending(channel, new TaskTimeoutError(`Task exceeded ${timeout}ms`), true)
      }, timeout)
    }

    return channel
  }

  private resolvePending(channel: number, value: unknown): void {
    const pending = this.removePending(channel)
    pending?.resolve(value)
  }

  private rejectPending(channel: number, error: Error): void {
    const pending = this.removePending(channel)
    if (!pending) return
    pending.reject(error)
    this.reportError(error, channel)
  }

  private cancelPending(channel: number, error: Error, reportError = false): void {
    const pending = this.removePending(channel)
    if (!pending) return
    this.cancelledChannels.add(channel)
    pending.reject(error)
    if (reportError) this.reportError(error, channel)

    try {
      this.worker.postMessage({ ev: CANCEL_EVENT, channel })
    } catch (postError) {
      this.cancelledChannels.delete(channel)
      this.reportError(this.toError(postError), channel)
    }
  }

  private removePending(channel: number): PendingRequest | undefined {
    const pending = this.pendingRequests.get(channel)
    if (!pending) return undefined
    this.pendingRequests.delete(channel)
    if (pending.timeoutId !== undefined) clearTimeout(pending.timeoutId)
    return pending
  }

  private failWorker(error: Error): void {
    if (this.workerFailure) return
    this.workerFailure = error
    this.cancelledChannels.clear()
    const channels = [...this.pendingRequests.keys()]
    if (channels.length === 0) this.reportError(error)
    for (const channel of channels) this.rejectPending(channel, error)
  }

  private reportError(error: Error, channel?: number): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(error, channel)
      } catch (callbackError) {
        console.error('Worker error callback failed', callbackError)
      }
    }
  }

  private toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error))
  }

  private createAbortError(): DOMException {
    return new DOMException('The task was aborted', 'AbortError')
  }
}

/**
 * Reusable task handle returned by {@link Provider.commit} and
 * {@link Provider.run}.
 */
export type {
  Task,
  UncancelableTask,
  EventMap,
  ExtWorker,
  EventPayload,
  ProviderWorker,
  EventCallback,
  ErrorCallback,
  ProcessorErrorCallback,
  OnCancelCallback,
}
export { Processor, Provider, TaskTimeoutError }
