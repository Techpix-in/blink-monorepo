import { BaseRedisRepository } from '../../redis/BaseRedisRepository';
import { Group } from '../../interfaces/group.interface';
import logger from '../../utils/logger';

export class GroupRepository extends BaseRedisRepository {

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

    getGroupChannelKey(groupId: string): string {
        return this.getKey('group', `${groupId}:channel`);
    }

    async save(group: Group, options?: { expiryTime?: number }): Promise<void> {
        try {
            const client = this.getClient();
            const key = this.getKey('group', group.groupId);
            
            const serializedGroup = {
                ...group,
                createdAt: group.createdAt.toISOString(),
                lastActivityAt: group.lastActivityAt.toISOString(),
                expiryTime: group.expiryTime.toString(),
                subscriberCount: group.subscriberCount.toString()
            };

            // Use multi to atomically set hash and its expiry if provided
            const multi = client.multi().hSet(key, serializedGroup);
            if (options?.expiryTime) {
                multi.expire(key, options.expiryTime);
            }
            await multi.exec();
        } catch (error) {
            logger.error('Failed to save group:', error);
            throw error;
        }
    }

    async get(groupId: string): Promise<Group | null> {
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

    async delete(groupId: string): Promise<void> {
        try {
            const client = this.getClient();
            await client.del(this.getKey('group', groupId));
        } catch (error) {
            logger.error('Failed to delete group:', error);
            throw error;
        }
    }

    async setGroupExpiry(groupId: string, expiryTime: number): Promise<void> {
        try{
            const key = this.getKey('group', groupId);
            await this.setKeyExpiry(key, expiryTime);
        } catch (error) {
            logger.error(`Failed to set group expiry: groupId ${groupId}, error ${error}`);
            throw error;
        }
    }
} 