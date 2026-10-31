<p align="center">
  <img src="./asset/logo.png" alt="Dispatcher logo" width="240">
</p>

<h1 align="center">Dispatcher</h1>

<p align="center">A small, typed toolkit for request/response messaging between your application and Web Workers.</p>

## Features

- Type-safe event maps for messages in both directions.
- Promise-based worker requests with optional timeouts.
- Worker-side cancellation callbacks for requests made with `commit`.
- Event listeners, fire-and-forget messages, and worker error callbacks.
- Run serializable functions in a worker with `run`.

## Installation

```sh
npm install @whsy/dispatcher
```

Use a bundler that supports Web Workers, or pass a worker URL to
`Provider.create`. The worker script must load the same dispatcher package.

## Quick start

Define the events sent from the application to the worker, and the events sent
back from the worker:

```ts
// events.ts
export type AppToWorker = {
  multiply: (value: number) => number;
};

export type WorkerToApp = {
  multiplied: (value: number) => void;
};
```

In the worker, create a `Processor` and register handlers:

```ts
// worker.ts
import { Processor } from '@whsy/dispatcher';
import type { AppToWorker, WorkerToApp } from './events';

const processor = new Processor<AppToWorker, WorkerToApp>();

processor.on('multiply', (value, emit, _onError, channel) => {
  emit('multiplied', value * 2, channel);
});
```

In the application, create a `Provider` connected to that worker:

```ts
// app.ts
import { Provider } from '@whsy/dispatcher';
import type { AppToWorker, WorkerToApp } from './events';

const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module',
});

const provider = Provider.create<WorkerToApp, AppToWorker>(worker);
const result = await provider.commit('multiply', 21).future;

console.log(result); // 42
```

`Provider.create` also exposes a promise-returning method for each output
event, so the same request can be written as `await provider.multiply(21)`.
Use `commit` when you need a task handle, a timeout, or cancellation.

The generic parameter order differs between the two sides:

- `Processor<InputEvents, OutputEvents>`: events received from the application,
  then events emitted to the application.
- `Provider.create<InputEvents, OutputEvents>`: events received from the
  worker, then events sent to the worker.

## Sending requests

Use `commit` to send a request and receive a `Task`:

```ts
const task = provider.commit('multiply', 21);
const result = await task.future;
```

The optional third argument sets a timeout in milliseconds:

```ts
const task = provider.commit('multiply', 21, { timeout: 2_000 });

try {
  console.log(await task.future);
} catch (error) {
  if (error instanceof Error) {
    console.error(error.name, error.message);
  }
}
```

When a timeout expires, `future` rejects with a `TaskTimeoutError`. The
processor is also notified so it can run any cancellation callback registered
for that request.

## Cancelling a request

`Task.cancel()` immediately rejects the local task's `future` with an
`AbortError`, then sends a cancellation message to the worker. Register
worker-side cleanup with the fifth argument to a processor handler:

```ts
processor.on('wait', (milliseconds, emit, _onError, channel, onCancel) => {
  const timer = setTimeout(() => {
    emit('waited', milliseconds, channel);
  }, milliseconds);

  onCancel(() => {
    clearTimeout(timer);
  });
});
```

Cancellation callbacks are associated with the request's channel and run at
most once. If a handler registers its callback after cancellation has already
arrived, the callback runs immediately. Cancellation is cooperative: the
worker must register cleanup or otherwise handle the cancellation callback;
the dispatcher cannot interrupt synchronous worker code.

```ts
const task = provider.commit('wait', 10_000);
task.cancel();

try {
  await task.future;
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    console.log('Request cancelled');
  }
}
```

## Events and notifications

Subscribe to events emitted by the worker with `on`, and remove a listener
with `off`:

```ts
const onProgress = (percent: number) => {
  console.log(`${percent}%`);
};

provider.on('progress', onProgress);
provider.off('progress', onProgress);
```

Use `emit` for a message that does not need a response:

```ts
provider.emit('set-mode', ['fast']);
```

The processor receives the payload followed by its `emit`, `onError`, optional
request channel, and `onCancel` arguments. For example:

```ts
processor.on('set-mode', (mode, _emit, _onError, _channel, onCancel) => {
  console.log(`Mode: ${mode}`);
  onCancel(() => console.log('The request was cancelled'));
});
```

Notifications sent with `emit` have no request channel, so their `onCancel`
registration is ignored.

## Running a function in the worker

Use `run` to evaluate a serializable function in the worker:

```ts
const task = provider.run((value: number) => value * 2, [21]);
console.log(await task.future); // 42
```

`run` returns an `UncancelableTask<T>` with a `future`, but no `cancel` method.
The function is reconstructed from its source text, so it cannot access
variables captured from the calling scope. Pass values in the `params` tuple.
The optional third argument supports a timeout:

```ts
const task = provider.run((value: number) => value * 2, [21], {
  timeout: 2_000,
});
```

## Worker errors

Register an error listener to receive worker errors and request failures:

```ts
provider.onError((error, channel) => {
  console.error('Worker error', { error, channel });
});
```

Remove it with `offError`. Errors associated with a request reject that
request's `future`; worker-level errors also reach the registered error
listeners.

## Documentation

The documentation site includes user guides, examples, and the generated API reference:

```sh
pnpm docs:dev
```

Build the site with `pnpm docs:build`. The published documentation is available at
<https://whimsystudio.github.io/dispatcher/docs/>.

## License

MIT
