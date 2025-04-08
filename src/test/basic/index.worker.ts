import { Processor } from '@wsys/dispatcher';
import { multiply, range } from 'lodash';
import { MEvents, WEvents } from './events';
import { WorkerInstance } from '@wsys/dispatcher/typings';
const worker = globalThis as WorkerInstance<{
  multiply: (multiplier: number, multiplicand: number)=>number
  range: (start: number, end?: number, step?: number)=>number[]
}>;
worker.multiply = multiply;
worker.range = range;
const processor = new Processor<MEvents, WEvents>(self as unknown as Worker);
processor.on('DOUBLE_NUMBER', (arg, emit, channel?: number) => {
  emit('DOUBLED_NUMBER', arg * 2, channel);
});
processor.on('COMBINE_MSG', (arg, emit, channel?: number) => {
  emit('COMBINED_MSG', `Hey,${arg}`, channel);
});
