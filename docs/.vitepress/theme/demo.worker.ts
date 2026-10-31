import { Processor } from '../../../src/lib/dispatcher';

type AppToWorker = {
  double: (value: number) => number;
};

type WorkerToApp = {
  doubled: (value: number) => void;
};

const processor = new Processor<AppToWorker, WorkerToApp>();

processor.on('double', (value, emit, _onError, channel) => {
  emit('doubled', value * 2, channel);
});
