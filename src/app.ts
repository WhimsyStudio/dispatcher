import './app.css';
import { Initiator } from '@wsys/dispatcher';
// @typescript-eslint/ban-ts-comment
// eslint-disable-next-line
// @ts-expect-error
import Worker from './dispatcher.worker';
import { IEvents, PEvents } from './events';

/**  Initiator initialize  **/
const initiator = new Initiator<PEvents, IEvents>(new Worker());
initiator.subscribe('DOUBLED_NUMBER', (n) => {
  console.log(n);
});
initiator.emit('DOUBLE_NUMBER', 10);
