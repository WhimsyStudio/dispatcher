import './app.css';
import { Provider } from '@wsys/dispatcher';
// eslint-disable-next-line
// @ts-expect-error
import Worker from './dispatcher.worker';
// eslint-disable-next-line
// @ts-expect-error
import DataWorker from './reactive.worker';
import { MEvents, WEvents } from './events';
import { DataProvider } from '@wsys/dispatcher/reactive';

(async () => {
  /**  Provider initialize  **/
  const provider = new Provider<WEvents, MEvents>(new Worker());
  provider.on('DOUBLED_NUMBER', (n) => {
    console.log(n);
  });
  provider.emit('DOUBLE_NUMBER', 10);
  const res = await provider.use('DOUBLE_NUMBER', 20);
  console.log(res);
  const combined = await provider.use('COMBINE_MSG', 'Lee');
  console.log(combined);
  const dataProvider = new DataProvider(new DataWorker());
  const data = {msg:'Hello, Worker'}
  const proxyData = dataProvider.addData('AA',data)
  proxyData.AA.msg  ='Hello,Lee'
})();
