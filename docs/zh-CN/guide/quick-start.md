# 快速开始

## 安装

```sh
npm install @whsy/dispatcher
```

可使用支持 Web Worker 的打包工具，也可以向 `Provider.create` 传入
Worker URL。Worker 脚本需要加载同一个 Dispatcher 包。

## 定义事件类型

应用程序发送 `multiply` 请求，并接收 `multiplied` 事件：

```ts
export type AppToWorker = {
  multiply: (value: number) => number;
};

export type WorkerToApp = {
  multiplied: (value: number) => void;
};
```

## 在 Worker 中处理请求

```ts
import { Processor } from '@whsy/dispatcher';
import type { AppToWorker, WorkerToApp } from './events';

const processor = new Processor<AppToWorker, WorkerToApp>();

processor.on('multiply', (value, emit, _onError, channel) => {
  emit('multiplied', value * 2, channel);
});
```

## 在应用程序中发送请求

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

`Provider.create` 还会为输出事件提供返回 Promise 的方法，因此也可以写成
`await provider.multiply(21)`。需要任务句柄、超时或取消能力时，请使用
`commit`。

两端泛型参数的顺序不同：

- `Processor<InputEvents, OutputEvents>`：先是应用程序发来的事件，再是发回
  应用程序的事件。
- `Provider.create<InputEvents, OutputEvents>`：先是 Worker 发来的事件，再是
  发往 Worker 的事件。

继续阅读[请求与取消](/zh-CN/guide/requests)，或试用[交互式示例](/zh-CN/examples/)。
