import { ExtWorker } from '@wsys/dispatcher';
export type TestWorker= ExtWorker<{
  multiply: (a: number, b: number) => number;
}>;
