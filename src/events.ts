type IEvents = {
  DOUBLE_NUMBER: (n: number) => number;
  COMBINE_MSG: (s: string) => string;
};
type PEvents = {
  DOUBLED_NUMBER: (n: number) => void;
  COMBINED_MSG: (s: string) => void;
};
export { IEvents, PEvents };
