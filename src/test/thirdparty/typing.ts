import { WorkerInstance } from '@wsys/dispatcher';
export type TestWorkerInstance = WorkerInstance<{
  multiply: (a: number, b: number) => number;
}>;
