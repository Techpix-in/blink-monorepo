import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import { DEFAULT_KEY_PREFIX } from '../config/constants';
import logger from '../utils/logger';


export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    tls?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}

export class RedisClient {
    private client: RedisClientType;
    private readonly keyPrefix: string;

    constructor(
        private config: RedisConfig,
        keyPrefix: string = DEFAULT_KEY_PREFIX
    ) {
        this.keyPrefix = keyPrefix;
        
        const options: RedisClientOptions = {
            socket: {
                host: this.config.host,
                port: this.config.port,
                tls: this.config.tls,
                reconnectStrategy: (retries) => {
                    if (retries > (this.config.retryAttempts || 3)) {
                        logger.error('Max redis reconnection attempts reached');
                        return new Error('Max reconnection attempts reached');
                    }
                    return this.config.retryDelay || 1000;
                },
                connectTimeout: this.config.timeout || 5000,
            },
            password: this.config.password,
            commandsQueueMaxLength: 1000
        };
        this.client = createClient(options) as RedisClientType;
        this.setupEventHandlers();
    }

    /**
     * Setup the events (connect, reconnecting, ready, reconnectFailed, end, error) for monitoring redis client
    */
    private setupEventHandlers(): void {
        this.client.on('error', (error) => {
            logger.error(`Redis client error: ${error}`, {
                error,
                host: this.config.host,
                port: this.config.port
            });
        });

        this.client.on('connect', () => {
            logger.info('Redis client connected', {
                host: this.config.host,
                port: this.config.port
            });
        });

        this.client.on('reconnecting', () => {
            logger.warn('Redis client reconnecting...', {
                host: this.config.host,
                port: this.config.port
            });
        });

        this.client.on('end', () => {
            logger.warn('Redis connection ended', {
                host: this.config.host,
                port: this.config.port
            });
        });

        this.client.on('ready', () => {
            logger.info('Redis client is ready to handle commands', {
                host: this.config.host,
                port: this.config.port
            });
        });

        this.client.on('reconnectFailed', () => {
            logger.error('Redis reconnection failed permanently', {
                host: this.config.host,
                port: this.config.port
            });
        });
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect();
        } catch (error) {
            logger.error('Failed to connect to Redis:', {
                error,
                host: this.config.host,
                port: this.config.port
            });
            throw error;
        }
    }

    isReady(): boolean {
        return this.client.isOpen;
    }

    getClient(): RedisClientType {
        if (!this.client.isOpen) {
            throw new Error('Redis client is not connected');
        }
        return this.client;
    }

    getKeyPrefix(): string {
        return this.keyPrefix;
    }

    async disconnect(): Promise<void> {
        try {
            await this.client.quit();
            logger.info('Redis client disconnected', {
                host: this.config.host,
                port: this.config.port
            });
        } catch (error) {
            logger.error('Error disconnecting Redis client:', {
                error,
                host: this.config.host,
                port: this.config.port
            });
            throw error;
        }
    }
} 