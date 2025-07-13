import { ExtWorker } from '@whsy/dispatcher';
export type TestWorker= ExtWorker<{
  multiply: (a: number, b: number) => number;
}>;
