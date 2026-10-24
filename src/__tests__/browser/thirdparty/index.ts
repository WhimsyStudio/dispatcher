import { Provider } from '@whsy/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import type { TestWorker } from './typing';
import { pinTestResult } from '../../utils';
(async () => {
  const provider =  Provider.create(new Worker())
  const res = await provider.run(
    (a, b) => {
      const worker = globalThis as TestWorker;
      return worker.multiply(a, b);
    },
    [3, 4],
  ).future;
  pinTestResult(res);
})();
