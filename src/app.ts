import './app.css';
import { Initiator } from '@wsys/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './dispatcher.worker';
import { IEvents, PEvents } from './events';

(async () => {
  /**  Initiator initialize  **/
  const initiator = new Initiator<PEvents, IEvents>(new Worker());
  initiator.on('DOUBLED_NUMBER', (n) => {
    console.log(n);
  });
  initiator.emit('DOUBLE_NUMBER', 10);
  const res = await initiator.asPromise('DOUBLE_NUMBER', 20);
  console.log(res);
  const combined = await initiator.asPromise('COMBINE_MSG', 'Lee');
  console.log(combined);
})();
