type IEvents = {
  DOUBLE_NUMBER: (n: number) => number;
};
type PEvents = {
  DOUBLED_NUMBER: (n: number) => void;
};
export { IEvents, PEvents };
