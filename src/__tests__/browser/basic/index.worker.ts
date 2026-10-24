import { Processor } from '@whsy/dispatcher';
import type { MEvents, WEvents } from './events';

const processor = new Processor<MEvents, WEvents>();
processor.on('doubleNum', (arg, emit, _onError, channel?: number) => {
  emit('doubledNum', arg * 2, channel);
});
