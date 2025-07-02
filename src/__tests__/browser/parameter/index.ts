import { Provider } from '@wsys/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import { MEvents, WEvents } from './events';
import { pinTestResult } from '../../utils';
(async () => {
  const provider =  Provider.create<WEvents, MEvents>((new Worker()));
  const two = await provider.commit('GET_TWO').future;
  pinTestResult(two)
  provider.commit('HAND_SHAKE').future.then(() => {
    pinTestResult('OK','test-res1')
  });
})();
