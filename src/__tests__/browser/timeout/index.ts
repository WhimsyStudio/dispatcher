import { Provider } from '@ws/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import { MEvents, WEvents } from './events';
import { pinTestResult } from '../../utils';
(async () => {
  const provider =  Provider.create<WEvents, MEvents>(new Worker());
  provider
    .commit('TIMEOUT_TASK', undefined, { timeout: 2000 })
    .future.then()
    .catch((e: Error) => {
      pinTestResult(e.message);
    });
})();
