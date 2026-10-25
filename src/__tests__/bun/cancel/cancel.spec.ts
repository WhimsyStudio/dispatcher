import { Provider } from '@whsy/dispatcher'
import { expect, test } from 'bun:test'
import type { MEvents, WEvents } from './events'

function createProvider() {
  return Provider.create<WEvents, MEvents>(
    new Worker(new URL('./index.worker.ts', import.meta.url)),
  )
}

function waitForEvent(
  provider: ReturnType<typeof createProvider>,
  event: keyof WEvents,
  id: number,
) {
  return new Promise<void>((resolve) => {
    provider.on(event, (receivedId) => {
      if (receivedId === id) resolve()
    })
  })
}

test('cancel rejects immediately and invokes the matching processor callback', async () => {
  const provider = createProvider()
  const firstStarted = waitForEvent(provider, 'STARTED', 1)
  const secondStarted = waitForEvent(provider, 'STARTED', 2)
  const order: string[] = []
  const firstCancelled = new Promise<void>((resolve) => {
    provider.on('CANCELLED', (id) => {
      if (id === 1) {
        order.push('worker-cancelled')
        resolve()
      }
    })
  })
  const secondCancelled = waitForEvent(provider, 'CANCELLED', 2)
  let secondCancellationCount = 0
  provider.on('CANCELLED', (id) => {
    if (id === 2) secondCancellationCount += 1
  })
  const firstTask = provider.commit('CANCELABLE', 1)
  const secondTask = provider.commit('CANCELABLE', 2)

  const firstRejected = firstTask.future.then(
    () => {
      throw new Error('Cancelled task unexpectedly resolved')
    },
    (error: Error) => {
      order.push('rejected')
      expect(error.name).toBe('AbortError')
    },
  )
  firstTask.cancel()

  await firstRejected
  expect(order).toEqual(['rejected'])
  await Promise.all([firstStarted, secondStarted, firstCancelled])

  expect(order).toEqual(['rejected', 'worker-cancelled'])
  expect(secondCancellationCount).toBe(0)

  secondTask.cancel()
  await expect(secondTask.future).rejects.toMatchObject({ name: 'AbortError' })
  await secondCancelled
  expect(secondCancellationCount).toBe(1)
  provider.terminate()
})

test('run returns a task without a cancel method', async () => {
  const provider = createProvider()
  const task = provider.run((value: number) => value * 2, [21])

  expect('cancel' in task).toBe(false)
  expect(await task.future).toBe(42)
  provider.terminate()
})
