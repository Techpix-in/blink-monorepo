import { RedisClient } from './RedisClient';
import { RedisClientType } from 'redis';

export abstract class BaseRedisRepository {
    protected readonly keyPrefix: string;

    constructor(protected redisClient: RedisClient) {
        this.keyPrefix = redisClient.getKeyPrefix();
    }

    protected getClient(): RedisClientType {
        return this.redisClient.getClient();
    }

    protected getKey(type: string, id: string): string {
        return `${this.keyPrefix}${type}:${id}`;
    }

    protected async setKeyExpiry(key: string, expiryTime: number): Promise<void> {
        const client = this.getClient();
        const expirySeconds = Math.ceil(expiryTime / 1000); // Convert ms to seconds
        await client.expire(key, expirySeconds);
    }
} 