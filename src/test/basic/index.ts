import { Provider } from '@wsys/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import { MEvents, WEvents } from './events';
import { WorkerInstance } from '@wsys/dispatcher/typings';

(async () => {
  /**  Provider initialize  **/
  const provider = new Provider<WEvents, MEvents>(new Worker());
  provider.on('DOUBLED_NUMBER', (n) => {
    console.log(n);
  });
  provider.emit('DOUBLE_NUMBER', 10);
  const res = await provider.commit('DOUBLE_NUMBER', 20);
  console.log(res);
  const combined = await provider.commit('COMBINE_MSG', 'Lee');
  console.log(combined);
  const added = await provider.run(() => {
    const worker = globalThis as WorkerInstance<{
      multiply: (multiplier: number, multiplicand: number) => number;
      range: (start: number, end?: number, step?: number) => number[];
    }>;
    return worker.multiply(3, 3);
  });
  const multiply = await provider.run(() => {
    return new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        fetch('https://cdn.jsdelivr.net/npm/jquery@3.6.4/dist/jquery.min.js', {
          method: 'GET',
        }).then((r) => {
          resolve(`Get jsdelivr status [${r.status}]`);
        });
      }, 0);
    });
  });
  const ranges = await provider.run(() => {
    const worker = globalThis as WorkerInstance<{
      multiply: (multiplier: number, multiplicand: number) => number;
      range: (start: number, end?: number, step?: number) => number[];
    }>;
    return worker.range(0, 11).map((e) => e * 2);
  });
  console.log(added);
  console.log(multiply);
  console.log(ranges);
})();
