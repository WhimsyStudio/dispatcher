import { Provider } from '@ws/dispatcher';
import { expect, test } from 'bun:test';
import { MEvents, WEvents } from './events';

test('Doubule Number Works Well', async () => {
  const provider =  Provider.create<WEvents, MEvents>(new Worker(new URL('./index.worker.ts', import.meta.url)),)
  const res = await provider.commit('DOUBLE_NUMBER', 20).future;
  expect(res).toBe(40);
});
