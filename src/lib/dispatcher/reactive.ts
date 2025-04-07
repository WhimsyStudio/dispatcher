import { Processor, Provider } from "@wsys/dispatcher";

type MEvents = {
  SET_DATA: (arg: { key: string | number | symbol, data: object }) => boolean;
  SYNC_DATA: (arg: {  prop: string | symbol, value: any }) => boolean;
};

type WEvents = {
  DATA_SETTLED: (result: boolean) => void;
  DATA_SYNCED: (result: boolean) => void;
};


class DataProcessor {
  private _processor!: Processor<MEvents, WEvents>;
  private _data: Record<string | number | symbol, any> = {};
  constructor(worker: Worker) {
    this._processor = new Processor(worker)
    this._processor.on('SYNC_DATA', (arg, emit, channel?: number) => {
      this._data[arg.prop] = arg.value
      emit('DATA_SYNCED', true, channel)
    })
    this._processor.on('SET_DATA', (arg, emit, channel?: number) => {
      this._data[arg.key] = new Proxy(arg.data, {
        get: (target: any, prop: string | symbol) => {
          return target[prop]
        },
        set: (target: any, p: string | symbol, newValue: any, receiver: any) => {
          target[p] = newValue;
          if (typeof p === 'string' && p === '$sync') {

          }
          return true
        }
      })
      emit('DATA_SETTLED', true, channel)
    })
  }
}

class DataProvider {
  private _provider!: Provider<WEvents, MEvents>;
  constructor(worker: Worker | string) {
    this._provider = new Provider(worker)
    this._provider.on('DATA_SETTLED', (result) => {
      console.log(result)
    })
    this._provider.on('DATA_SYNCED', (result) => {
      console.log(result)
    })
  }
  addData<T extends object,K extends string>(key: K | symbol, data: T): Record<K,T> {
    this._provider.emit('SET_DATA', { key, data })
    const d:Record<string|symbol,any> = {}
    let _data = data
    if(typeof data ==='object'){
      _data = new Proxy<typeof data> (data, {
        get: (target: any, prop: string | symbol) => {
          return target[prop]
        },
        set: (target: any, p: string | symbol, newValue: any, receiver: any) => {
          target[p] = newValue;
          if (typeof p === 'string' && p === '$sync') {
  
          }
          this._provider.emit('SYNC_DATA', { prop: p, value: newValue })
          return true
        }
      })
    }  
    d[key] = _data
    return new Proxy<Record<string|symbol,T> >(d, {
      get: (target: any, prop: string | symbol) => {
        return target[prop]
      },
      set: (target: any, p: string | symbol, newValue: any, receiver: any) => {
        target[p] = newValue;
        if (typeof p === 'string' && p === '$sync') {

        }
        this._provider.emit('SYNC_DATA', {  prop: p, value: newValue })
        return true
      }
    })
  }
}
export { DataProcessor, DataProvider };
