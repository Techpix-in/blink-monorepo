import { Request, Response } from 'express';
import { GroupManager } from '../../core/groups/GroupManager';
import { validators } from '../../utils/validators';
import logger from '../../utils/logger';

export class GroupController {
    constructor(private groupManager: GroupManager) {}

    async createGroup(req: Request, res: Response): Promise<void> {
        try {
            const { groupName, expiryTime } = req.body;

            if (!validators.isValidGroupName(groupName)) {
                res.status(400).json({ error: 'Invalid group name' });
                return;
            }

            const group = await this.groupManager.createGroup({
                groupName,
                expiryTime: expiryTime || 24 * 60 * 60 * 1000 // Default 24 hours
            });

            res.status(201).json(group);
        } catch (error) {
            logger.error('Failed to create group:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async listGroups(req: Request, res: Response): Promise<void> {
        try {
            const { page = '1', limit = '10', sortBy = 'createdAt', order = 'desc' } = req.query;
            const groups = await this.groupManager.listGroups(
                parseInt(page as string),
                parseInt(limit as string),
                sortBy as string,
                order as 'asc' | 'desc'
            );

            res.json(groups);
        } catch (error) {
            logger.error('Failed to list groups:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getGroup(req: Request, res: Response): Promise<void> {
        try {
            const { groupId } = req.params;
            const group = await this.groupManager.getGroup(groupId);

            if (!group) {
                res.status(404).json({ error: 'Group not found' });
                return;
            }

            res.json(group);
        } catch (error) {
            logger.error('Failed to get group:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateGroup(req: Request, res: Response): Promise<void> {
        try {
            const { groupId } = req.params;
            const { groupName, expiryTime } = req.body;

            if (groupName && !validators.isValidGroupName(groupName)) {
                res.status(400).json({ error: 'Invalid group name' });
                return;
            }

            const updatedGroup = await this.groupManager.updateGroup(groupId, {
                groupName,
                expiryTime
            });

            res.json(updatedGroup);
        } catch (error) {
            logger.error('Failed to update group:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteGroup(req: Request, res: Response): Promise<void> {
        try {
            const { groupId } = req.params;
            await this.groupManager.deleteGroup(groupId);
            res.status(204).send();
        } catch (error) {
            logger.error('Failed to delete group:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
} 