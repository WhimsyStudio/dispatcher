import { Provider } from '@whsy/dispatcher';
import { expect, test } from 'bun:test';
import { MEvents, WEvents } from './events';

test('Divide by Zero Handles Error Correctly', async () => {
  const provider = Provider.create<WEvents, MEvents>(new Worker(new URL('./index.worker.ts', import.meta.url)),)
  provider.DIV_BY_ZERO(40).then((_) => {}).catch((error) => {
    expect(error).toBe('Could not divide by zero');
  });
});
