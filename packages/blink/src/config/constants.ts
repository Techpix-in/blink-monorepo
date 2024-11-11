export const DEFAULT_KEY_PREFIX = 'blink:';

export interface BlinkConfig {
    keyPrefix?: string;
    redis: {
        host: string;
        port: number;
        password?: string;
        tls?: boolean;
        timeout?: number;
        retryAttempts?: number;
        retryDelay?: number;
    };
} 