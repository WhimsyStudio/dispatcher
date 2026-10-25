import { Processor } from '@whsy/dispatcher';
import type { TestWorker } from './typing';
import { multiply } from 'lodash-es';

const worker = globalThis as TestWorker
worker.multiply = multiply

new Processor<{}, {}>();
