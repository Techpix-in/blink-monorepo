import { TagUpdate } from '../../interfaces/tag.interface';
import logger from '../../utils/logger';
import { RedisClient } from '../repositories/RedisClient';

export class AuditLogger {
    private readonly RETENTION_DAYS = 90; // Default 90-day retention

    constructor(
        private redisClient: RedisClient
    ) {}

    async logTagUpdate(update: TagUpdate): Promise<void> {
        try {
            const key = `audit:tags:${update.userId}:${Date.now()}`;
            await this.redisClient.getClient().hSet(key, {
                userId: update.userId,
                timestamp: update.timestamp.toISOString(),
                previousTags: JSON.stringify(update.previousTags),
                newTags: JSON.stringify(update.newTags),
                updateSource: update.updateSource
            });

            // Set expiry for retention policy
            await this.redisClient.getClient().expire(key, this.RETENTION_DAYS * 24 * 60 * 60);
            
            logger.info(`Tag update logged for user ${update.userId}`);
        } catch (error) {
            logger.error('Failed to log tag update:', error);
            throw error;
        }
    }

    async logEventDelivery(
        eventId: string,
        userId: string,
        groupId: string,
        eventTags: string[],
        userTags: string[]
    ): Promise<void> {
        try {
            const key = `audit:events:${eventId}:${userId}:${Date.now()}`;
            await this.redisClient.getClient().hSet(key, {
                eventId,
                userId,
                groupId,
                timestamp: new Date().toISOString(),
                eventTags: JSON.stringify(eventTags),
                userTags: JSON.stringify(userTags)
            });

            await this.redisClient.getClient().expire(key, this.RETENTION_DAYS * 24 * 60 * 60);
            
            logger.info(`Event delivery logged: ${eventId} to user ${userId}`);
        } catch (error) {
            logger.error('Failed to log event delivery:', error);
            throw error;
        }
    }
} 