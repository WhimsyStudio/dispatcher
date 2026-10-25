import { Processor } from '@whsy/dispatcher'
import type { MEvents, WEvents } from './events'

const processor = new Processor<MEvents, WEvents>()

processor.on('CANCELABLE', (id, emit, _onError, channel, onCancel) => {
  emit('STARTED', id, undefined)

  const timeout = setTimeout(() => emit('COMPLETED', id, channel), 30_000)
  onCancel(() => {
    clearTimeout(timeout)
    emit('CANCELLED', id, undefined)
  })
})
