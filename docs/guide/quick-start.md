# Quick start

## Install

```sh
npm install @whsy/dispatcher
```

Use a bundler that supports Web Workers, or pass a worker URL to
`Provider.create`. The worker script must load the same Dispatcher package.

## Define the event maps

The application sends `multiply` requests and receives `multiplied` events:

```ts
export type AppToWorker = {
  multiply: (value: number) => number;
};

export type WorkerToApp = {
  multiplied: (value: number) => void;
};
```

## Handle requests in the worker

```ts
import { Processor } from '@whsy/dispatcher';
import type { AppToWorker, WorkerToApp } from './events';

const processor = new Processor<AppToWorker, WorkerToApp>();

processor.on('multiply', (value, emit, _onError, channel) => {
  emit('multiplied', value * 2, channel);
});
```

## Send requests from the application

```ts
import { Provider } from '@whsy/dispatcher';
import type { AppToWorker, WorkerToApp } from './events';

const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module',
});

const provider = Provider.create<WorkerToApp, AppToWorker>(worker);
const result = await provider.commit('multiply', 21).future;

console.log(result); // 42
```

`Provider.create` also exposes promise-returning methods for output events, so
you can write `await provider.multiply(21)`. Use `commit` when you need the
task handle, a timeout, or cancellation.

The generic parameter order differs between the two sides:

- `Processor<InputEvents, OutputEvents>`: events received from the application,
  then events sent back to it.
- `Provider.create<InputEvents, OutputEvents>`: events received from the worker,
  then events sent to the worker.

Continue with [requests and cancellation](/guide/requests) or try the
[interactive demo](/examples/).
