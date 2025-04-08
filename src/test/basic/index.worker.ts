import { Processor } from '@wsys/dispatcher';
import { MEvents, WEvents } from './events';

const processor = new Processor<MEvents, WEvents>();
processor.on('DOUBLE_NUMBER', (arg, emit, channel?: number) => {
  emit('DOUBLED_NUMBER', arg * 2, channel);
});
