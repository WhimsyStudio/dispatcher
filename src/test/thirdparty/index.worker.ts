import { Processor } from '@wsys/dispatcher';
import { TestWorker } from './typing';
import { multiply } from 'lodash';

const worker = globalThis as TestWorker
worker.multiply = multiply

new Processor<{}, {}>();
