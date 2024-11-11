import BlinkClient, { BlinkOptions } from "./BlinkClient";

export const createBlinkClient = (url: string, options: BlinkOptions) => {
  const client = new BlinkClient(url, options);
  client.connect();
  return client;
};
