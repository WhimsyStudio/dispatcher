import { Processor } from '@ws/dispatcher';
import { MEvents, WEvents } from './events';

const processor = new Processor<MEvents,WEvents>();
processor.on('TIMEOUT_TASK',(emit,channel?:number)=>{
    setTimeout(()=>emit('TIMEOUT_TASK_OVER',channel),10 * 1000)
})