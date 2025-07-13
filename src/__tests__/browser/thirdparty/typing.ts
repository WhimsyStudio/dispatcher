import { ExtWorker } from '@ws/dispatcher';
export type TestWorker= ExtWorker<{
  multiply: (a: number, b: number) => number;
}>;
