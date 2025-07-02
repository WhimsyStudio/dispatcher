import { Provider } from '@wsys/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import { MEvents, WEvents } from './events';
import { pinTestResult } from '../../utils';
(async () => {
  const provider =  Provider.create<WEvents, MEvents>(new Worker());
  const res = await provider.commit('DOUBLE_NUMBER', 20).future;
  pinTestResult(res);
})();
