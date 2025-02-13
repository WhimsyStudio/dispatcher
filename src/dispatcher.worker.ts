import { IEvents, PEvents } from './events';
import { Processor } from '@wsys/dispatcher';

const processor = new Processor<IEvents, PEvents>(self as unknown as Worker);
processor.on('DOUBLE_NUMBER', (n, emit, channel?: number) => {
  emit('DOUBLED_NUMBER', n * 2, channel);
});
processor.on('COMBINE_MSG', (s, emit, channel?) => {
  emit('COMBINED_MSG', `Hey,${s}`, channel);
});
