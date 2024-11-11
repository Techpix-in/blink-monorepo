import { RedisClient } from '../repositories/RedisClient';
import logger from '../../utils/logger';

export class AuditStorage {
    constructor(private redisClient: RedisClient) {}

    async getUserTagHistory(
        userId: string,
        startDate: Date,
        endDate: Date,
        page: number,
        limit: number
    ): Promise<any[]> {
        try {
            const client = this.redisClient.getClient();
            const pattern = `audit:tags:${userId}:*`;
            const keys = await client.keys(pattern);
            
            // Filter by date range and paginate
            const filteredKeys = keys.filter(key => {
                const timestamp = parseInt(key.split(':')[3]);
                return timestamp >= startDate.getTime() && timestamp <= endDate.getTime();
            })
            .sort((a, b) => parseInt(b.split(':')[3]) - parseInt(a.split(':')[3]))
            .slice((page - 1) * limit, page * limit);

            const history = await Promise.all(
                filteredKeys.map(async key => {
                    const data = await client.hGetAll(key);
                    return {
                        timestamp: data.timestamp,
                        previousTags: JSON.parse(data.previousTags),
                        newTags: JSON.parse(data.newTags),
                        updateSource: data.updateSource
                    };
                })
            );

            return history;
        } catch (error) {
            logger.error('Failed to get user tag history:', error);
            throw error;
        }
    }

    async getEventDeliveryHistory(
        eventId: string,
        page: number,
        limit: number
    ): Promise<any[]> {
        try {
            const client = this.redisClient.getClient();
            const pattern = `audit:events:${eventId}:*`;
            const keys = await client.keys(pattern);
            
            // Paginate results
            const paginatedKeys = keys
                .sort((a, b) => parseInt(b.split(':')[4]) - parseInt(a.split(':')[4]))
                .slice((page - 1) * limit, page * limit);

            const history = await Promise.all(
                paginatedKeys.map(async key => {
                    const data = await client.hGetAll(key);
                    return {
                        userId: data.userId,
                        timestamp: data.timestamp,
                        userTags: JSON.parse(data.userTags),
                        groupId: data.groupId
                    };
                })
            );

            return history;
        } catch (error) {
            logger.error('Failed to get event delivery history:', error);
            throw error;
        }
    }
} 