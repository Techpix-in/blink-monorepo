import { RedisStorage } from '@/storage/redis/RedisStorage';
import { TagUpdate } from '../../interfaces/tag.interface';


import logger from '../../utils/logger';
import { AuditLogger } from '@/storage/audit/AuditLogger';
// import { UserTagRepository } from '@/storage/redis/UserTagRepository';
import { RedisClient } from '@/redis/RedisClient';
import { UserManager } from '../users/UserManager';

export class TagManager {
    constructor(
        private storage: RedisStorage,
        private client: RedisClient,
        private userManager: UserManager,
        private userTagRepository: UserTagRepository,
        private auditLogger: AuditLogger
    ) {}

    async updateUserTags(
        userId: string,
        newTags: string[],
        updateSource: string
    ): Promise<void> {
        try {
            const previousTags = await this.userManager.getUserTags(userId)
            
            // Create tag update record
            const tagUpdate: TagUpdate = {
                userId,
                timestamp: new Date(),
                previousTags,
                newTags,
                updateSource
            };

            // Update tags in storage
            await this.userTagRepository.setTags(userId, newTags);
            await this.storage.setUserTags(userId, newTags);
            
            // Log the update to audit trail
            await this.auditLogger.logTagUpdate(tagUpdate);
            
            logger.info(`Tags updated for user ${userId}`);
        } catch (error) {
            logger.error(`Failed to update tags for user ${userId}:`, error);
            throw error;
        }
    }

    async getUserTags(userId: string): Promise<string[]> {
        return await this.storage.getUserTags(userId);
    }
} 