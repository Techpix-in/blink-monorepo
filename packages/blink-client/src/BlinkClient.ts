import { io, Socket } from "socket.io-client";

export type BlinkOptions = {
  withCredentials?: boolean;
  transports?: string[];
  [key: string]: any; // Allow additional options as needed
};

class BlinkClient {
  private url: string;
  private options: BlinkOptions;
  private socket: Socket | null;

  constructor(url: string, options: BlinkOptions = {}) {
    this.url = url;
    this.options = options;
    this.socket = null;
  }

  /**
   * Initialize Socket.IO connection with specified options.
   */
  connect(): void {
    if (!this.socket) {
      this.socket = io(this.url, {
        withCredentials: true,
        transports: ["websocket"],
        ...this.options,
      });

      this.socket.on("connect", () => console.log("Connected to Blink server"));
      this.socket.on("disconnect", () =>
        console.log("Disconnected from Blink server")
      );
    }
  }

  /**
   * Subscribe to a specific event.
   * @param event - The event name.
   * @param callback - Callback function for handling the event data.
   */
  subscribe(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Unsubscribe from a specific event.
   * @param event - The event name.
   */
  unsubscribe(event: string): void {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  /**
   * Emit a message to a specific group.
   * @param groupId - The group ID.
   * @param event - The event name.
   * @param data - The data to send.
   */
  sendMessage(groupId: string, event: string, data: Record<string, any>): void {
    if (this.socket) {
      this.socket.emit("message", { groupId, event, data });
    }
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default BlinkClient;
