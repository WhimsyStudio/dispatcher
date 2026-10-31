# 请求与取消

## 等待请求

使用 `commit` 发送请求并获取任务：

```ts
const task = provider.commit('multiply', 21);
const result = await task.future;
```

第三个参数用于设置超时时间（毫秒）。超时后，`future` 会以
`TaskTimeoutError` 拒绝，并通知 Worker 请求已取消：

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

## 取消请求

调用 `Task.cancel()` 会立即使本地 `future` 以 `AbortError` 拒绝，并通知 Worker：

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

可通过 Processor 处理器的第五个参数注册 Worker 侧清理逻辑：

```ts
processor.on('wait', (milliseconds, emit, _onError, channel, onCancel) => {
  const timer = setTimeout(() => {
    emit('waited', milliseconds, channel);
  }, milliseconds);

  onCancel(() => clearTimeout(timer));
});
```

取消采用协作方式：注册清理逻辑或自行响应取消回调。Dispatcher 无法中断正在执行的
同步代码。回调与请求 channel 绑定，最多执行一次；如果取消消息先到达，回调会在
注册时立即执行。

完整 API 请查看 [API 参考](/api/)。
