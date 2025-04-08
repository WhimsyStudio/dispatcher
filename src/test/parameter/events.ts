type MEvents = {
  GET_TWO: () => number;
  HAND_SHAKE:()=> void
};
type WEvents = {
  RETURN_TWO: (n: number) => void;
  HAND_SHAKE_OK:()=> void
};
export { MEvents, WEvents };
