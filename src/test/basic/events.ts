type  MEvents = {
  DOUBLE_NUMBER: (n: number) => number;
  COMBINE_MSG: (s: string) => string;
};
type WEvents = {
  DOUBLED_NUMBER: (n: number) => void;
  COMBINED_MSG: (s: string) => void;
};
export { WEvents, MEvents };
