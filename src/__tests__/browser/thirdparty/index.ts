import { Provider } from '@wsys/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import { TestWorker } from './typing';
import { pinTestResult } from '../../utils';
(async () => {
  const provier = new Provider(new Worker());
  const res = await provier.run(
    (a, b) => {
      const worker = globalThis as TestWorker;
      return worker.multiply(a, b);
    },
    [3, 4],
  ).future;
  pinTestResult(res);
})();
