/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

type Task<T> = {
  future: Promise<T>
  cancel: () => void
}

type ErrorCallback = (error: Error, channel?: number) => void
type ProcessorErrorCallback = (error: unknown) => void

type EventCallback<
  T extends (...args: any[]) => any,
  Callback extends (...args: any[]) => any,
> = T extends (...args: infer P) => void
  ? (...args: [...P, Callback, ProcessorErrorCallback, (number | undefined)?]) => void
  : never

type SerializedError = {
  name: string
  message: string
  stack?: string
}

type EventPayload = {
  ev: string | symbol
  payload: unknown
  channel?: number
}

type EventMap = {
  [key: string | symbol]: (arg: any) => void
}

type ExtWorker<ExtraAttrs extends { [key: string | symbol]: any }> = typeof globalThis &
  Worker &
  ExtraAttrs

type ProviderWorker<I extends EventMap, O extends EventMap> = Provider<I, O> & {
  [K in keyof O]: O[K] extends (...args: any[]) => any
    ? (...args: Parameters<O[K]>) => Promise<ReturnType<O[K]>>
    : never
}

type PendingRequest = {
  reject: (error: Error) => void
  resolve: (value: unknown) => void
  timeoutId?: ReturnType<typeof setTimeout>
}

const ERROR_EVENT = '__DISPATCHER_ERROR__'
const RUN_EVENT = 'RUN'
const RUN_RESULT_EVENT = 'RUN_RES'

class TaskTimeoutError extends Error {
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

class Processor<InputEvents extends EventMap, OutputEvents extends EventMap> {
  private readonly worker: Worker = globalThis as unknown as Worker
  private readonly handlers: Record<string | symbol, Function> = {}

  constructor() {
    this.worker.onmessage = (event: MessageEvent<EventPayload>) => {
      const { ev, payload, channel } = event.data
      if (ev === RUN_EVENT) {
        this.handleRun(payload, channel)
        return
      }

      const handler = this.handlers[ev]
      if (!handler) {
        this.postError(new Error(`No processor handler registered for "${String(ev)}"`), channel)
        return
      }

      const emit = (...args: any[]) => {
        const [outputEvent, outputPayload, outputChannel] = args
        this.worker.postMessage({
          ev: outputEvent,
          payload: args.length === 2 ? undefined : outputPayload,
          channel: args.length === 2 ? outputPayload : outputChannel,
        })
      }
      const onError: ProcessorErrorCallback = (error) => this.postError(error, channel)

      try {
        const result =
          payload === undefined
            ? handler.call(this.worker, emit, onError, channel)
            : handler.call(
                this.worker,
                Array.isArray(payload) ? payload[0] : payload,
                emit,
                onError,
                channel,
              )
        void Promise.resolve(result).catch((error: unknown) => this.postError(error, channel))
      } catch (error) {
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

class Provider<InputEvents extends EventMap, OutputEvents extends EventMap> {
  private readonly worker: Worker
  private readonly handlers: Record<string | symbol, Function[]> = {}
  private readonly pendingRequests = new Map<number, PendingRequest>()
  private readonly errorHandlers = new Set<ErrorCallback>()
  private nextChannel = 0
  private workerFailure: Error | undefined
  private isTerminated = false

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

    return { future, cancel: () => {} } as any
  }

  on<Ev extends keyof InputEvents & (string | symbol)>(ev: Ev, listener: InputEvents[Ev]): void {
    this.handlers[ev] = this.handlers[ev] || []
    this.handlers[ev].push(listener)
  }

  off<Ev extends keyof InputEvents & (string | symbol)>(ev: Ev, listener: InputEvents[Ev]): void {
    const handlers = this.handlers[ev]
    if (!handlers) return
    const index = handlers.findIndex((handler) => handler === listener)
    if (index >= 0) handlers.splice(index, 1)
  }

  onError(listener: ErrorCallback): void {
    this.errorHandlers.add(listener)
  }

  offError(listener: ErrorCallback): void {
    this.errorHandlers.delete(listener)
  }

  terminate(): void {
    if (this.isTerminated) return

    this.isTerminated = true
    this.workerFailure ??= new Error('Worker has been terminated')
    for (const channel of this.pendingRequests.keys()) {
      const pending = this.removePending(channel)
      pending?.reject(this.workerFailure)
    }
    for (const key of Object.keys(this.handlers)) {
      delete this.handlers[key]
    }
    this.errorHandlers.clear()
    this.worker.terminate()
  }

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

  run<T, D extends Readonly<[...any]>>(
    func: (
      ...params: {
        [i in keyof D]: Awaited<D[i]> extends unknown ? Awaited<D[i]> : Awaited<D[i]>
      } & Array<any>
    ) => T,
    params?: Readonly<[...D]>,
    opts?: { timeout?: number },
  ): Task<T> {
    if (this.workerFailure) {
      return { future: Promise.reject(this.workerFailure), cancel: () => {} }
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

    return { future, cancel: () => {} }
  }

  private createPendingRequest(
    resolve: (value: unknown) => void,
    reject: (error: Error) => void,
    timeout?: number,
  ): number {
    const channel = this.nextChannel++
    const pending: PendingRequest = {
      resolve,
      reject,
    }
    this.pendingRequests.set(channel, pending)

    if (timeout !== undefined) {
      pending.timeoutId = setTimeout(() => {
        this.rejectPending(channel, new TaskTimeoutError(`Task exceeded ${timeout}ms`))
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
}

export type {
  Task,
  EventMap,
  ExtWorker,
  EventPayload,
  ProviderWorker,
  EventCallback,
  ErrorCallback,
  ProcessorErrorCallback,
}
export { Processor, Provider, TaskTimeoutError }
