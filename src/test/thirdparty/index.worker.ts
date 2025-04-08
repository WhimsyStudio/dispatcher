import { Processor } from '@wsys/dispatcher';
import { TestWorkerInstance } from './typing';
import { multiply } from 'lodash';

const worker = globalThis as TestWorkerInstance
worker.multiply = multiply

new Processor<{}, {}>(self as unknown as Worker);
