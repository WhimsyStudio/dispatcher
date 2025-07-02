import { Provider } from '@wsys/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import { pinTestResult } from '../../utils';
(async () => {
  const provider =  Provider.create<{}, {}>(new Worker());
  const res = await provider.run(
    (n) => {
      return n * 2;
    },
    [20],
  ).future;
  pinTestResult(res);
})();
