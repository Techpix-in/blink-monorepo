export interface SocketConfig {
    cors: {
        origin: string | string[];
        methods: string[];
    };
    pingTimeout: number;
    pingInterval: number;
}

export const socketConfig: SocketConfig = {
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || '*',
        methods: ['GET', 'POST']
    },
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '5000'),
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '10000')
}; 