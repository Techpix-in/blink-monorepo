import { RedisClient } from './RedisClient';
import { Group } from '../../interfaces/group.interface';
import { Message } from '../../interfaces/message.interface';
import logger from '../../utils/logger';

export class RedisStorage {
    private readonly keyPrefix: string;

    constructor(private redisClient: RedisClient) {
        this.keyPrefix = redisClient.getKeyPrefix();
    }

    getClient() {
        return this.redisClient.getClient();
    }

    async saveGroup(group: Group, options: {expiryTime: number}): Promise<void> {
        try {
            const client = this.getClient();
            const key = this.getKey('group', group.groupId);
            
            // Serialize dates and numbers explicitly
            const serializedGroup = {
                ...group,
                createdAt: group.createdAt.toISOString(),
                lastActivityAt: group.lastActivityAt.toISOString(),
                expiryTime: group.expiryTime.toString(),
                subscriberCount: group.subscriberCount.toString()
            };

            // Node Redis client allows hSet with object notation, automatically sets multiple field-value pairs
            await client.hSet(key, serializedGroup);
        } catch (error) {
            logger.error('Failed to save group:', error);
            throw error;
        }
    }

    async getGroup(groupId: string): Promise<Group | null> {
        try {
            const client = this.getClient();
            const key = this.getKey('group', groupId);
            const group = await client.hGetAll(key);

            if (!Object.keys(group).length) {
                return null;
            }

            return this.deserializeGroup(group);
        } catch (error) {
            logger.error('Failed to get group:', error);
            throw error;
        }
    }

    async deleteGroup(groupId: string): Promise<void> {
        try {
            const client = this.getClient();
            await client.del(this.getKey('group', groupId));
        } catch (error) {
            logger.error('Failed to delete group:', error);
            throw error;
        }
    }

        async saveMessage(clientId: string, message: Message): Promise<void> {
            try {
                const client = this.getClient();
                const key = this.getKey('messages', clientId);
                await client.lPush(key, JSON.stringify(message));
            } catch (error) {
                logger.error('Failed to save message:', error);
                throw error;
            }
        }

        async removeMessage(clientId: string, eventId: string): Promise<void> {
            try {
                const client = this.getClient();
                const key = this.getKey('messages', clientId);
                
                // Get all messages and filter out the one with matching eventId
                const messages = await client.lRange(key, 0, -1);
                for (const messageStr of messages) {
                    const message = JSON.parse(messageStr);
                    if (message.eventId === eventId) {
                        await client.lRem(key, 1, messageStr);
                    }
                }
            } catch (error) {
                logger.error('Failed to remove message:', error);
                throw error;
            }
        }

    async getUserTags(userId: string): Promise<string[]> {
        try {
            const client = this.getClient();
            return await client.sMembers(this.getKey('user', `${userId}:tags`));
        } catch (error) {
            logger.error('Failed to get user tags:', error);
            throw error;
        }
    }

    async setUserTags(userId: string, tags: string[]): Promise<void> {
        try {
            const client = this.getClient();
            const key = this.getKey('user', `${userId}:tags`);
            
            await client.multi()
                .del(key)
                .sAdd(key, tags)
                .exec();
        } catch (error) {
            logger.error('Failed to set user tags:', error);
            throw error;
        }
    }

    private getKey(type: string, id: string): string {
        return `${this.keyPrefix}${type}:${id}`;
    }

    private deserializeGroup(data: Record<string, string>): Group {
        return {
            groupId: data.groupId,
            groupName: data.groupName,
            createdAt: new Date(data.createdAt),
            expiryTime: parseInt(data.expiryTime),
            subscriberCount: parseInt(data.subscriberCount),
            lastActivityAt: new Date(data.lastActivityAt)
        };
    }
} 