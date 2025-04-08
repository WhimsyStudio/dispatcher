import { Provider } from '@wsys/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import { MEvents, WEvents } from './events';
import * as $ from 'jquery'
(async () => {
  const provider = new Provider<WEvents, MEvents>(new Worker());
  const res = await provider.commit('DOUBLE_NUMBER', 20).future;
  $(document.body).append(`<span id="test-res">${res}<span>`)
})();
