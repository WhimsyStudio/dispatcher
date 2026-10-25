<p align="center">
  <img src="./asset/logo.png" alt="Dispatcher 标志" width="240">
</p>

<h1 align="center">Dispatcher</h1>

<p align="center">用于应用程序与 Web Worker 之间双向消息通信的轻量级、类型安全工具库。</p>

## 功能特性

- 使用类型化事件映射定义双向消息。
- 通过 Promise 调用 Worker，支持可选超时。
- `commit` 请求支持取消，并可在 Worker 侧注册清理回调。
- 支持事件监听、无需响应的消息和 Worker 错误回调。
- 使用 `run` 在 Worker 中执行可序列化函数。

## 安装

```sh
npm install @whsy/dispatcher
```

可使用支持 Web Worker 的打包工具，也可以向 `Provider.create` 传入
Worker URL。Worker 脚本需要加载同一个 Dispatcher 包。

## 快速开始

分别定义应用程序发往 Worker、以及 Worker 发回应用程序的事件：

```ts
// events.ts
export type AppToWorker = {
  multiply: (value: number) => number;
};

export type WorkerToApp = {
  multiplied: (value: number) => void;
};
```

在 Worker 中创建 `Processor` 并注册处理器：

```ts
// worker.ts
import { Processor } from '@whsy/dispatcher';
import type { AppToWorker, WorkerToApp } from './events';

const processor = new Processor<AppToWorker, WorkerToApp>();

processor.on('multiply', (value, emit, _onError, channel) => {
  emit('multiplied', value * 2, channel);
});
```

在应用程序中创建连接到该 Worker 的 `Provider`：

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

`Provider.create` 还会为每个输出事件提供一个返回 Promise 的方法，因此也可以写成
`await provider.multiply(21)`。如果需要任务句柄、超时或取消能力，请使用 `commit`。

两端泛型参数的顺序不同：

- `Processor<InputEvents, OutputEvents>`：先是从应用程序接收的事件，再是发回
  应用程序的事件。
- `Provider.create<InputEvents, OutputEvents>`：先是从 Worker 接收的事件，再是
  发往 Worker 的事件。

## 发送请求

使用 `commit` 发送请求并获取 `Task`：

```ts
const task = provider.commit('multiply', 21);
const result = await task.future;
```

可通过第三个参数设置超时时间（毫秒）：

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

超时后，`future` 会以 `TaskTimeoutError` 拒绝。Dispatcher 也会通知 Worker，
以便执行该请求注册的取消回调。

## 取消请求

调用 `Task.cancel()` 会立即使本地 `future` 以 `AbortError` 拒绝，然后向
Worker 发送取消消息。可通过 Processor 处理器的第五个参数注册 Worker 侧清理逻辑：

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

取消回调会与请求的 channel 绑定，且最多执行一次。如果取消消息先到达、
处理器之后才注册回调，该回调会立即执行。取消采用协作方式：Worker 代码需要
注册清理逻辑或自行响应取消；Dispatcher 无法中断正在执行的同步代码。

```ts
const task = provider.commit('wait', 10_000);
task.cancel();

try {
  await task.future;
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    console.log('请求已取消');
  }
}
```

## 事件与通知

使用 `on` 监听 Worker 发出的事件，使用 `off` 移除监听器：

```ts
const onProgress = (percent: number) => {
  console.log(`${percent}%`);
};

provider.on('progress', onProgress);
provider.off('progress', onProgress);
```

对于不需要响应的消息，使用 `emit`：

```ts
provider.emit('set-mode', ['fast']);
```

Processor 处理器会依次接收消息载荷、`emit`、`onError`、可选请求 channel 和
`onCancel`。例如：

```ts
processor.on('set-mode', (mode, _emit, _onError, _channel, onCancel) => {
  console.log(`当前模式：${mode}`);
  onCancel(() => console.log('请求已取消'));
});
```

通过 `emit` 发送的通知没有请求 channel，因此其中注册的 `onCancel` 回调会被忽略。

## 在 Worker 中执行函数

使用 `run` 在 Worker 中执行可序列化函数：

```ts
const task = provider.run((value: number) => value * 2, [21]);
console.log(await task.future); // 42
```

`run` 返回 `UncancelableTask<T>`，其中包含 `future`，但没有 `cancel` 方法。
函数会通过源码重建，因此不能访问调用处闭包中的变量；需要的数据应通过 `params`
元组传入。第三个参数可设置超时：

```ts
const task = provider.run((value: number) => value * 2, [21], {
  timeout: 2_000,
});
```

## Worker 错误

注册错误监听器以接收 Worker 错误和请求失败：

```ts
provider.onError((error, channel) => {
  console.error('Worker 错误', { error, channel });
});
```

使用 `offError` 移除错误监听器。与请求关联的错误会使对应的 `future` 拒绝；
Worker 级别的错误也会通知已注册的错误监听器。

## API 文档

可在本地生成 TypeDoc API 文档：

```sh
npm run doc
```

生成的文档位于 `docs/`。

## 许可证

MIT
