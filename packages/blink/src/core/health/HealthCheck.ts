import { RedisClient } from '../../storage/repositories/RedisClient';
import logger from '../../utils/logger';

export class HealthCheck {
    constructor(private redisClient: RedisClient) {}

    async check(): Promise<{
        status: 'healthy' | 'unhealthy';
        redis: boolean;
        uptime: number;
    }> {
        try {
            const redisHealth = await this.checkRedis();
            
            return {
                status: redisHealth ? 'healthy' : 'unhealthy',
                redis: redisHealth,
                uptime: process.uptime()
            };
        } catch (error) {
            logger.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                redis: false,
                uptime: process.uptime()
            };
        }
    }

    private async checkRedis(): Promise<boolean> {
        try {
            const client = this.redisClient.getClient();
            await client.ping();
            return true;
        } catch {
            return false;
        }
    }
} 