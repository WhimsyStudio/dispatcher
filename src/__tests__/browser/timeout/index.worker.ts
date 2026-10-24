import { Processor } from '@whsy/dispatcher';
import type { MEvents,WEvents } from './events';

const processor = new Processor<MEvents,WEvents>();
processor.on('TIMEOUT_TASK',(emit,_onError,channel?:number)=>{
    setTimeout(()=>emit('TIMEOUT_TASK_OVER',channel),10 * 1000)
})