type  MEvents = {
  DIV_BY_ZERO: (n: number) => number;
};
type WEvents = {
  DIV_BY_ZERO: (n: number) => void;
};
export type { WEvents, MEvents };
