import { Provider } from '@wsys/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import * as $ from 'jquery';
(async () => {
  const provider = new Provider<{}, {}>(new Worker());
  const res = await provider.run(
    (n) => {
      return n * 2;
    },
    [20],
  );
  $(document.body).append(`<span id="test-res">${res}<span>`);
})();
