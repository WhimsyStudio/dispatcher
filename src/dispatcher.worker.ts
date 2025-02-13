import { IEvents, PEvents } from './events';
import { Processor } from '@wsys/dispatcher';

const processor = new Processor<IEvents, PEvents>(self as unknown as Worker);
processor.on('DOUBLE_NUMBER', (n, emit) => {
  emit('DOUBLED_NUMBER', n * 2);
});
