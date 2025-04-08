/**
 * @description Data model for MessageEvent in web worker.
 */
interface Message {
  /**
   * @description Event Name
   */
  ev: string | symbol;
  /**
   * @description Parameter
   */
  payload: any;
  /**
   * @description Channel ID
   */
  channel?: number;
}

export { Message };
