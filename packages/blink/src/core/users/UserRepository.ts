import { BaseRedisRepository } from '../../redis/BaseRedisRepository';

import logger from '../../utils/logger';
import { PaginatedUsers, User, UserWithoutGroupsAndTags } from '@/interfaces/user.interface';
import { cli } from 'winston/lib/winston/config';


export class UserRepository extends BaseRedisRepository {
    
    private deserializeUser(data: Record<string, string>): UserWithoutGroupsAndTags {
        return {
            connectionId: data.connectionId,
            identifier: data.identifier,
            // groups: data.groups ? data.groups.split(',') : [],
            createdAt: new Date(data.createdAt),
            // tags: data.tags ? data.tags.split(',') : []
        };
    }

    getUserChannelKey(userId: string): string {
        return this.getKey('user', `${userId}:channel`)
    }

    async save(
        user: User, 
        options?: { 
            expiryTime?: number
        }): Promise<void> {
        try {
            const client = this.getClient();
            const userkey = this.getKey('user', user.identifier);
            const connectionUserKey = this.getKey('connection', `${user.connectionId}:user`);
            const userTagskey = this.getKey('user', `${user.identifier}:tags`);
            const userGroupskey = this.getKey('user', `${user.identifier}:groups`);
            
            const serializedUser = {
                ...user,
                createdAt: user.createdAt.toISOString(),
                disconnectedAt: user.disconnectedAt?.toISOString()
            };

            // update user and tags
            // set connection user key to user key
            const multi = client.multi()
                .hSet(userkey, 'identifier', serializedUser.identifier)
                .hSet(userkey, 'createdAt', serializedUser.createdAt)
                .hSet(userkey, 'connectionId', serializedUser.connectionId)
                .del(userTagskey)
                .sAdd(userTagskey, serializedUser.tags)
                .del(userGroupskey)
                .sAdd(userGroupskey, serializedUser.groups)
                .set(connectionUserKey, userkey)
                .expire(connectionUserKey, options?.expiryTime || -1)
            if (serializedUser.disconnectedAt) {
                multi.hSet(userkey, 'disconnectedAt', serializedUser.disconnectedAt);
            } else {
                multi.hDel(userkey, 'disconnectedAt');
            }
            if (options?.expiryTime) {
                multi.expire(userkey, options.expiryTime);
                multi.expire(userTagskey, options.expiryTime);
                multi.expire(userGroupskey, options.expiryTime);
            }
            await multi.exec();
        } catch (error) {
            logger.error('Failed to save user:', error);
            throw error;
        }
    }

    

    async setTags(userId: string, tags: string[], options?: { expiryTime?: number }): Promise<void> {
        try {
            const client = this.getClient();
            const userTagskey = this.getKey('user', `${userId}:tags`);
            
            const multi = client.multi()
                .del(userTagskey)
                .sAdd(userTagskey, tags);
                
            if (options?.expiryTime) {
                multi.expire(userTagskey, options.expiryTime);
            }
            
            await multi.exec();
        } catch (error) {
            logger.error('Failed to set user tags:', error);
            throw error;
        }
    }

    async get(userId: string): Promise<UserWithoutGroupsAndTags | null> {
        try {
            const client = this.getClient();
            const key = this.getKey('user', userId);
            const user = await client.hGetAll(key);

            if (!Object.keys(user).length) {
                return null;
            }
            return {
                connectionId: user.connectionId,
                identifier: user.identifier,
                createdAt: new Date(user.createdAt),
            };
        } catch (error) {
            logger.error('Failed to get user:', error);
            throw error;
        }
    }

    async getTags(userId: string): Promise<string[]> {
        try {
            const client = this.getClient();
            const userTagskey = this.getKey('user', `${userId}:tags`);
            const tags = await client.sMembers(userTagskey);
            return tags;
        } catch (error) {
            logger.error('Failed to get user tags:', error);
            throw error;
        }
    }

    async findByConnectionId(connectionId: string): Promise<UserWithoutGroupsAndTags | null> {
        const userKey = this.getKey('connection', `${connectionId}:user`);
        const user = userKey ? await this.redisClient.getClient().hGetAll(userKey) : null;
        if (!user) {
            return null;
        }
        return this.deserializeUser(user);
    }

    /**
     * Returns a map of connectionIds to users
    */
    async bulkFindByConnectionIds(connectionIds: string[]): Promise<Record<string, UserWithoutGroupsAndTags | null>> {
        const userKeys = connectionIds.map(connectionId => this.getKey('connection', `${connectionId}:user`));
        
        const clientUserFetchPipeline = this.redisClient.getClient().multi();
        userKeys.forEach(userKey => {
            clientUserFetchPipeline.get(userKey);
        });
        const userFetchResults = await clientUserFetchPipeline.execAsPipeline();    
        const clientUserMap = userFetchResults.reduce((acc, result, index) => {
            acc[connectionIds[index]] = result ? result as string : null;
            return acc;
        }, {} as Record<string, string | null>);
        const userIds = Object.values(clientUserMap).filter(userId => userId !== null) as string[];
        
        const pipeline = this.redisClient.getClient().multi();
        userIds.forEach(userId => {
            pipeline.hGetAll(userId);
        });
        const results = await pipeline.execAsPipeline();
        
        const userMap = results.reduce((acc, result, index) => {
            acc[userIds[index]] = result ?this.deserializeUser(result as unknown as Record<string, string>) : null;
            return acc;
        }, {} as Record<string, UserWithoutGroupsAndTags | null>);

        //lookup usermap and store user objects against clientIds
        return connectionIds.reduce((acc, connectionId) => {
            const userId = clientUserMap[connectionId];
            acc[connectionId] = userId ? userMap[userId] : null;
            return acc;
        }, {} as Record<string, UserWithoutGroupsAndTags | null>);
    }

    async delete(userId: string, connectionId: string): Promise<void> {
        try {
            const client = this.getClient();
            const userkey = this.getKey('user', userId);
            const userTagskey = this.getKey('user', `${userId}:tags`);
            const userGroupskey = this.getKey('user', `${userId}:groups`);
            const connectionUserKey = this.getKey('connection', `${connectionId}:user`);
            await client.del(userkey);
            await client.del(userTagskey);
            await client.del(userGroupskey);
            await client.del(connectionUserKey);
        } catch (error) {
            logger.error('Failed to delete user:', error);
            throw error;
        }
    }

    async setUserExpiry(userId: string, connectionId: string, expiryTime: number): Promise<void> {
        try {
            const userkey = this.getKey('user', userId);
            const connectionUserKey = this.getKey('connection', `${connectionId}:user`);
            const userTagskey = this.getKey('user', `${userId}:tags`);
            const userGroupskey = this.getKey('user', `${userId}:groups`);
            await this.setKeyExpiry(userkey, expiryTime);
            await this.setKeyExpiry(userTagskey, expiryTime);
            await this.setKeyExpiry(userGroupskey, expiryTime);
            await this.setKeyExpiry(connectionUserKey, expiryTime);
        } catch (error) {
            logger.error(`Failed to set user expiry: userId ${userId}, error ${error}`);
            throw error;
        }
    }

    // Additional user-specific methods could go here
    async updateDisconnectedAt(userId: string): Promise<void> {
        try {
            const client = this.getClient();
            const key = this.getKey('user', userId);
            await client.hSet(key, 'disconnectedAt', new Date().toISOString());
        } catch (error) {
            logger.error('Failed to update user disconnectedAt:', error);
            throw error;
        }
    }

    async updateStatus(userId: string, status: string): Promise<void> {
        try {
            const client = this.getClient();
            const key = this.getKey('user', userId);
            await client.hSet(key, 'status', status);
        } catch (error) {
            logger.error('Failed to update user status:', error);
            throw error;
        }
    }

    /**
     * Returns a map of userIds to tags
    */
    async getBulkUserTags(userIds: string[]): Promise<Record<string, string[]>> {
        logger.debug(`Getting tags for ${userIds} users`);
        if (userIds.length === 0) return {};
        // Add all SMEMBERS commands to pipeline
        const pipeline = this.redisClient.getClient().multi();
        userIds.forEach(userId => {
            const userTagskey = this.getKey('user', `${userId}:tags`);
            pipeline.sMembers(userTagskey);
        });

        // Execute pipeline
        const results = await pipeline.exec()
        
        // Map results to userId -> tags
        return results.reduce((acc, result, index) => {
            if (result && Array.isArray(result)) {
                acc[userIds[index]] = result as string[];
            }
            return acc;
        }, {} as Record<string, string[]>);
    }

    async listUsers(page: number = 1, limit: number = 10): Promise<PaginatedUsers> {
        try {
            const client = this.getClient();
            const pattern = this.getKey('user', '*');
            const offset = (page - 1) * limit;
            
            // First, get total count for pagination metadata
            const totalCount = await client.keys(pattern).then(keys => keys.length);
            
            // Use SCAN to get paginated keys
            let cursor = 0;
            let keys: string[] = [];
            let skippedCount = 0;
            
            do {
                const res = await client.scan(cursor, {
                    MATCH: pattern,
                    COUNT: Math.max(300, offset + limit) // Ensure batch size is large enough
                });
                
                cursor = res.cursor;
                
                // Skip keys before offset
                if (skippedCount < offset) {
                    const keysToSkip = Math.min(res.keys.length, offset - skippedCount);
                    skippedCount += keysToSkip;
                    res.keys.splice(0, keysToSkip);
                }
                
                // Collect keys for current page
                if (skippedCount >= offset) {
                    keys = keys.concat(res.keys);
                }
                
                // Stop if we have enough keys
                if (keys.length >= limit) {
                    keys = keys.slice(0, limit); // Ensure we don't exceed limit
                    break;
                }
            } while (cursor !== 0);
            
            // Slice keys for current page
            const pageKeys = keys.slice(offset, offset + limit);
            
            // Fetch user data in parallel
            const pipeline = client.multi();
            keys.forEach(key => {
                pipeline.hGetAll(key);
            });
            
            const usersData = await pipeline.execAsPipeline();
            // const userMap = usersData.reduce((acc, result, index) => {
            //     acc[keys[index]] = result ?this.deserializeUser(result as unknown as Record<string, string>) : null;
            //     return acc;
            // }, {} as Record<string, UserWithoutGroupsAndTags | null>);
            const users = usersData.map(
                result => result ?this.deserializeUser(result as unknown as Record<string, string>) : null
            ).filter(user => user !== null)
            return {
                users,
                metadata: {
                    page,
                    limit,
                    totalCount,
                    hasMore: totalCount > (offset + users.length)
                }
            };
        } catch (error) {
            logger.error('Failed to list users:', error instanceof Error ? error.stack : error);
            throw error;
        }
    }

} 