import { Provider } from "@wsys/dispatcher";
// eslint-disable-next-line
// @ts-expect-error
import Worker from './index.worker';
import * as $ from 'jquery'
import { TestWorkerInstance } from "./typing";
(async()=>{
    const provier = new Provider(new Worker());
    const res = await provier.run((a,b)=>{
      const worker = globalThis as TestWorkerInstance;
      return worker.multiply(a,b)
    },[3,4])
    $(document.body).append(`<span id="test-res">${res}</span>`)
})()