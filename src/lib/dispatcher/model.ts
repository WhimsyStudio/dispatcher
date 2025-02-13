interface Message {
  ev: string | symbol;
  payload: any;
  channel?: number;
}

export { Message };
