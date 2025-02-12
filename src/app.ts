import './app.css';
import { Initiator, Processor } from '@wsys/dispatcher';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import Worker from './dispatcher.worker';

/** Testing Sample **/
type InputEvents = {
  COMBINE_MESSAGE: (name: { name: string }) => void;
  DOUBLE_NUMBER: (a: number) => void;
  RESERVE_STRING: (data: { str: string }) => void;
  BEGIN_COUNT: () => void;
  INIT_CANVAS: (params: {
    canvas: OffscreenCanvas;
    transfer: Transferable[];
  }) => void;
  DRAW_RECT: (params: { width: number; height: number; color: string }) => void;
};

type OutputEvents = {
  COMBINED_MESSAGE: (message: string) => void;
  DOUBLED_NUMBER: (res: number) => number;
  RESERVED_STRING: (res: { str: string }) => string;
  SEND_COUNT: (count: number) => void;
};
/**  Processor & Initiator initialize  **/
const initiator = new Initiator<InputEvents, OutputEvents>(new Worker());
initiator.asPromise('RESERVED_STRING', { str: 'Jack' }).then((res) => {
  console.log(res);
});
initiator.asPromise('DOUBLED_NUMBER', 10).then((n) => {
  console.log(n);
});
initiator.subscribe('COMBINE_MESSAGE', (res) => {
  console.log(res);
});
initiator.emit('DOUBLED_NUMBER', 20);
const processor = new Processor<InputEvents, OutputEvents>();
processor.on('COMBINE_MESSAGE', (req, emit) => {
  console.log(req);
  emit('COMBINED_MESSAGE', 'lee');
});
