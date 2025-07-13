import { ExtWorker } from '@wsso/dispatcher';
export type TestWorker= ExtWorker<{
  multiply: (a: number, b: number) => number;
}>;
