import { Processor } from '@ws/dispatcher';
import { MEvents, WEvents } from './events';

const processor = new Processor<MEvents, WEvents>();
processor.on('HAND_SHAKE', (emit, channel?: number) => {
  emit('HAND_SHAKE_OK', channel);
});
processor.on('GET_TWO', (emit, channel?: number) => {
  emit('RETURN_TWO', 2, channel);
});
