import { Processor } from "@whsy/dispatcher";
import { MEvents, WEvents } from "./events";

const processor = new Processor<MEvents, WEvents>();
processor.on('DIV_BY_ZERO', (arg, emit, _onError, channel?: number) => {
  try {
    emit('DIV_BY_ZERO', arg / 0, channel);
  } catch (e) {
    _onError('Could not divide by zero');
  }
});
