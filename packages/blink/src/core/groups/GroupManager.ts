import { Group, GroupCreateRequest } from '../../interfaces/group.interface';
import { GroupError } from '../../utils/errors';
import logger from '../../utils/logger';

import { GroupConfig } from '@/config/app.config';
import { GroupRepository } from './GroupRepository';
import { GroupMembershipRepository } from './GroupMembershipRepository';

export class GroupManager {
    // private readonly DELETION_TIMEOUT = 300; // 5 minutes in seconds
    constructor(
        private groupConfig: GroupConfig,
        private groupRepository: GroupRepository,
        private groupMembershipRepository: GroupMembershipRepository
    ) {}

    private generateGroupId(): string {
        return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    async createGroup(request: GroupCreateRequest): Promise<Group> {
        const group: Group = {
            groupId: this.generateGroupId(),
            groupName: request.groupName,
            createdAt: new Date(),
            expiryTime: request.expiryTime,
            subscriberCount: 0,
            lastActivityAt: new Date()
        };

        await this.groupRepository.save(group, { expiryTime: group.expiryTime });
        logger.info(`Group created: ${group.groupId}`);
        return group;
    }

    async getGroup(groupId: string): Promise<Group> {
        const group = await this.groupRepository.get(groupId);
        if (!group) {
            throw new GroupError('Group not found');
        }
        return group;
    }

    async updateSubscriberCount(groupId: string, delta: number): Promise<void> {
        const group = await this.getOrCreateGroup(groupId);
        
        group.subscriberCount += delta;
        group.lastActivityAt = new Date();

        // const expiryTime = group.subscriberCount <= 0 ? this.DELETION_TIMEOUT : group.expiryTime;
        await this.groupRepository.save(group, { expiryTime: this.groupConfig.inactiveGroupTimeout });
    }

    async getOrCreateGroup(groupId: string): Promise<Group> {
        try {
            // First try to get the existing group
            const existingGroup = await this.groupRepository.get(groupId);
            if (existingGroup) {
                return existingGroup;
            }
            // If group doesn't exist, create a new one
            const newGroup: Group = {
                groupId,
                groupName: groupId, // Use groupId as name by default
                createdAt: new Date(),
                expiryTime: this.groupConfig.inactiveGroupTimeout,
                subscriberCount: 0,
                lastActivityAt: new Date()
            };

            await this.groupRepository.save(newGroup, { 
                expiryTime: newGroup.expiryTime 
            });
            
            logger.info(`Auto-created group: ${groupId}`);
            return newGroup;
        } catch (error) {
            logger.error(`Failed to get or create group ${groupId}:`, error);
            throw new GroupError(`Failed to get or create group: ${groupId}`);
        }
    }

    //join group
    async joinGroup(groupId: string, connectionId: string): Promise<void> {
        await this.groupMembershipRepository.joinGroup(groupId, connectionId);
        await this.updateSubscriberCount(groupId, 1);
    }

    getGroupChannelKey(groupId: string): string {
        return this.groupRepository.getGroupChannelKey(groupId);
    }

    //leave group
    async leaveGroup(groupId: string, connectionId: string): Promise<void> {
        await this.groupMembershipRepository.leaveGroup(groupId, connectionId);
        await this.updateSubscriberCount(groupId, -1);
    }
} 