import { Processor } from '@wsys/dispatcher';
import { MEvents, WEvents } from './events';

const processor = new Processor<MEvents, WEvents>();
processor.on('doubleNum', (arg, emit, channel?: number) => {
  emit('doubledNum', arg * 2, channel);
});
