# Events and errors

## Listen for worker events

Use `on` to subscribe and `off` to remove a listener:

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

Notifications sent with `emit` have no request channel, so worker-side
`onCancel` callbacks are not associated with them.

## Run a serializable function

`run` evaluates a function in the worker and returns an un-cancelable task:

```ts
const task = provider.run((value: number) => value * 2, [21]);
console.log(await task.future); // 42
```

The function is reconstructed from its source text and cannot access variables
captured from the calling scope. Pass values in the `params` tuple. An optional
third argument sets a timeout:

```ts
const task = provider.run((value: number) => value * 2, [21], {
  timeout: 2_000,
});
```

## Handle errors

Register an error listener for worker-level errors and request failures:

```ts
provider.onError((error, channel) => {
  console.error('Worker error', { error, channel });
});
```

Use `offError` to remove it. Errors associated with a request reject that
request's `future`; worker-level errors also reach registered error listeners.

Next: explore the [examples](/examples/) or browse the [API reference](/api/).
