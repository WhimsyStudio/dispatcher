import { WEvents, MEvents } from './events';
import { Processor } from '@wsys/dispatcher';

const processor = new Processor<MEvents, WEvents>(self as unknown as Worker);
processor.on('DOUBLE_NUMBER', (arg, emit, channel?: number) => {
  emit('DOUBLED_NUMBER', arg * 2, channel);
});
processor.on('COMBINE_MSG', (arg, emit, channel?: number) => {
  emit('COMBINED_MSG', `Hey,${arg}`, channel);
});
