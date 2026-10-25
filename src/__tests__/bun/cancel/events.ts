type MEvents = {
  CANCELABLE: (id: number) => void
}

type WEvents = {
  STARTED: (id: number) => void
  CANCELLED: (id: number) => void
  COMPLETED: (id: number) => void
}

export type { MEvents, WEvents }
