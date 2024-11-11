import { BaseRedisRepository } from '../../redis/BaseRedisRepository';
import logger from '../../utils/logger';

export class UserTagRepository extends BaseRedisRepository {
    async getTags(userId: string): Promise<string[]> {
        try {
            const client = this.getClient();
            return await client.sMembers(this.getKey('user', `${userId}:tags`));
        } catch (error) {
            logger.error('Failed to get user tags:', error);
            throw error;
        }
    }

    async setTags(userId: string, tags: string[], options?: { expiryTime?: number }): Promise<void> {
        try {
            const client = this.getClient();
            const key = this.getKey('user', `${userId}:tags`);
            
            const multi = client.multi()
                .del(key)
                .sAdd(key, tags);
                
            if (options?.expiryTime) {
                multi.expire(key, options.expiryTime);
            }
            
            await multi.exec();
        } catch (error) {
            logger.error('Failed to set user tags:', error);
            throw error;
        }
    }
} 