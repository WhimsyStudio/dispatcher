import { Processor } from '@wsso/dispatcher';
import { TestWorker } from './typing';
import { multiply } from 'lodash';

const worker = globalThis as TestWorker
worker.multiply = multiply

new Processor<{}, {}>();
