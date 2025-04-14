import { Provider } from '@wsys/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import { MEvents, WEvents } from './events';
import * as $ from 'jquery'
(async () => {
  const provider = new Provider<WEvents, MEvents>(new Worker());
  provider.commit('TIMEOUT_TASK', undefined, { timeout: 2000 }).future.then().catch((e: Error) => {
    $(document.body).append(`<span id="test-res">${e.message}<span>`)
  })
})();
