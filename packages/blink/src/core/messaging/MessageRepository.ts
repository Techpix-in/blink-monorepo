import { BaseRedisRepository } from '../../redis/BaseRedisRepository';
import { Message } from '../../interfaces/message.interface';
import logger from '../../utils/logger';

export class MessageRepository extends BaseRedisRepository {
    async save(clientId: string, message: Message, options?: { expiryTime?: number }): Promise<void> {
        try {
            const client = this.getClient();
            const key = this.getKey('messages', clientId);
            
            const multi = client.multi().lPush(key, JSON.stringify(message));
            
            if (options?.expiryTime) {
                multi.expire(key, options.expiryTime);
            }
            
            await multi.exec();
        } catch (error) {
            logger.error('Failed to save message:', error);
            throw error;
        }
    }

    async remove(clientId: string, eventId: string): Promise<void> {
        try {
            const client = this.getClient();
            const key = this.getKey('messages', clientId);
            
            const messages = await client.lRange(key, 0, -1);
            const multi = client.multi();
            
            for (const messageStr of messages) {
                const message = JSON.parse(messageStr);
                if (message.eventId === eventId) {
                    multi.lRem(key, 1, messageStr);
                }
            }
            
            await multi.exec();
        } catch (error) {
            logger.error('Failed to remove message:', error);
            throw error;
        }
    }
} 