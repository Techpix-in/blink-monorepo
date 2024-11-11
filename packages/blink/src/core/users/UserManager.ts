import logger from '../../utils/logger';

import { PaginatedUsers, UserWithoutGroupsAndTags } from '../../interfaces/user.interface';
import { UserRepository } from './UserRepository';
import { User } from '@/interfaces/user.interface';

export class UserManager {
    constructor(
        private userRepository: UserRepository
    ) {}

    private generateUserId(): string {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    //TODO: implement user listing for admin api
    async listUsers(page: number, limit: number): Promise<PaginatedUsers> {
        try {
            const users = await this.userRepository.listUsers(page, limit);
            return users;
        } catch (error) {
            logger.error('Failed to list users:', error);
            throw error;
        }
    }

    getUserChannelKey(userId: string): string {
        return this.userRepository.getUserChannelKey(userId);
    }
    
    //get user tags
    async getUserTags(connectionId: string): Promise<string[]> {
        const user = await this.userRepository.findByConnectionId(connectionId);
        if (!user) {
            throw new Error('User not found');
        }
        return await this.userRepository.getTags(user.identifier);
    }

    /**
     * Returns a map of userIds to tags
    */
    async getBulkUserTags(userIds: string[]): Promise<Record<string, string[]>> {
        return await this.userRepository.getBulkUserTags(userIds);
    }

    /**
     * Returns a map of connectionIds to users
    */
    async bulkFindByConnectionIds(connectionIds: string[]): Promise<Record<string, UserWithoutGroupsAndTags | null>> {
        return await this.userRepository.bulkFindByConnectionIds(connectionIds);
    }

    
} 