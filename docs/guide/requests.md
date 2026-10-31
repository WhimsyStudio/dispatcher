# Requests and cancellation

## Await a request

Use `commit` to send a request and receive a task:

```ts
const task = provider.commit('multiply', 21);
const result = await task.future;
```

The third argument sets a timeout in milliseconds. If it expires, `future`
rejects with a `TaskTimeoutError`, and the worker is notified of cancellation:

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

## Cancel a request

Calling `Task.cancel()` immediately rejects the local `future` with an
`AbortError` and notifies the worker:

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

Register worker-side cleanup with the processor handler's fifth argument:

```ts
processor.on('wait', (milliseconds, emit, _onError, channel, onCancel) => {
  const timer = setTimeout(() => {
    emit('waited', milliseconds, channel);
  }, milliseconds);

  onCancel(() => clearTimeout(timer));
});
```

Cancellation is cooperative: register cleanup or otherwise handle the
cancellation callback. Dispatcher cannot interrupt synchronous worker code.
Callbacks are associated with the request channel, run at most once, and run
immediately if cancellation arrived before they were registered.

For the full API, see the [API reference](/api/).
