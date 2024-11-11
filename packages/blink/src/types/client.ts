import { Socket } from "socket.io";

export interface ConnectedClient {
    id: string;
    socket: Socket;
    clientIdentifier: string;
    permissions: string[];
    groups: string[];
    disconnectedAt?: Date;
}

// Define a type for a dictionary containing key and data
export type MapIterableRecord<T> = {
    key: string;
    data: T;
};
