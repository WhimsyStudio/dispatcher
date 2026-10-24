import { Processor } from '@whsy/dispatcher';
import type { MEvents, WEvents } from './events';

const processor = new Processor<MEvents, WEvents>();
processor.on('HAND_SHAKE', (emit, _onError, channel?: number) => {
  emit('HAND_SHAKE_OK', channel);
});
processor.on('GET_TWO', (emit, _onError, channel?: number) => {
  emit('RETURN_TWO', 2, channel);
});
