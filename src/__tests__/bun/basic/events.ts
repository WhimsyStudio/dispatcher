type  MEvents = {
  DOUBLE_NUMBER: (n: number) => number;
};
type WEvents = {
  DOUBLED_NUMBER: (n: number) => void;
};
export { WEvents, MEvents };
