import { Provider } from '@wsys/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import * as $ from 'jquery';
import { MEvents, WEvents } from './events';
(async () => {
  const provider = new Provider<WEvents, MEvents>(new Worker());
  const two = await provider.commit('GET_TWO').future;
  $(document.body).append(`<span id="test-res">${two}<span>`);
  provider.commit('HAND_SHAKE').future.then(() => {
    $(document.body).append(`<span id="test-res1">OK<span>`);
  });
})();
