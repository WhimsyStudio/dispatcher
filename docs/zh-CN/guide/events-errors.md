# 事件与错误

## 监听 Worker 事件

使用 `on` 订阅事件，并通过 `off` 移除监听器：

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

通过 `emit` 发送的通知没有请求 channel，因此 Worker 侧的 `onCancel` 回调不会与其关联。

## 在 Worker 中执行函数

`run` 会在 Worker 中执行函数，并返回不可取消的任务：

```ts
const task = provider.run((value: number) => value * 2, [21]);
console.log(await task.future); // 42
```

函数会通过源码重建，因此不能访问调用处闭包中的变量；需要的数据应通过 `params`
元组传入。第三个参数可设置超时：

```ts
const task = provider.run((value: number) => value * 2, [21], {
  timeout: 2_000,
});
```

## 处理错误

注册错误监听器以接收 Worker 级别错误和请求失败：

```ts
provider.onError((error, channel) => {
  console.error('Worker 错误', { error, channel });
});
```

使用 `offError` 移除监听器。与请求关联的错误会使对应的 `future` 拒绝；
Worker 级别错误也会通知已注册的错误监听器。

接下来可以浏览[示例](/zh-CN/examples/)或查看 [API 参考](/api/)。
