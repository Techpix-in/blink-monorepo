import { Request, Response } from 'express';
import { validators } from '../../utils/validators';
import logger from '../../utils/logger';
import { UserManager } from '@/core/users/UserManager';
import { TagManager } from '@/core/tags/TagManager';

export class AdminController {
    constructor(
        // private tagManager: TagManager,
        private userManager: UserManager
    ) {}

    // User Management
    async listUsers(req: Request, res: Response): Promise<void> {
        try {
            const { page = '1', limit = '10' } = req.query;
            const users = await this.userManager.listUsers(
                parseInt(page as string),
                parseInt(limit as string)
            );
            res.json(users);
        } catch (error) {
            logger.error('Failed to list users:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    //TODO:
    // async createUser(req: Request, res: Response): Promise<void> {
    //     try {
    //         const { username, tags = [] } = req.body;

    //         if (!validators.isValidTags(tags)) {
    //             res.status(400).json({ error: 'Invalid tags format' });
    //             return;
    //         }

    //         const user = await this.userManager.createUser({ username, tags });
    //         res.status(201).json(user);
    //     } catch (error) {
    //         logger.error('Failed to create user:', error);
    //         res.status(500).json({ error: 'Internal server error' });
    //     }
    // }

    // async updateUser(req: Request, res: Response): Promise<void> {
    //     try {
    //         const { userId } = req.params;
    //         const { tags } = req.body;

    //         if (!validators.isValidTags(tags)) {
    //             res.status(400).json({ error: 'Invalid tags format' });
    //             return;
    //         }

    //         await this.tagManager.updateUserTags(userId, tags, 'ADMIN');
    //         res.status(200).json({ success: true });
    //     } catch (error) {
    //         logger.error('Failed to update user:', error);
    //         res.status(500).json({ error: 'Internal server error' });
    //     }
    // }

    // // Tag Management
    // async listTags(req: Request, res: Response): Promise<void> {
    //     try {
    //         const { page = '1', limit = '10' } = req.query;
    //         const tags = await this.tagManager.listAllTags(
    //             parseInt(page as string),
    //             parseInt(limit as string)
    //         );
    //         res.json(tags);
    //     } catch (error) {
    //         logger.error('Failed to list tags:', error);
    //         res.status(500).json({ error: 'Internal server error' });
    //     }
    // }

    // async createTag(req: Request, res: Response): Promise<void> {
    //     try {
    //         const { name, description } = req.body;
    //         const tag = await this.tagManager.createTag({ name, description });
    //         res.status(201).json(tag);
    //     } catch (error) {
    //         logger.error('Failed to create tag:', error);
    //         res.status(500).json({ error: 'Internal server error' });
    //     }
    // }

    // async updateTag(req: Request, res: Response): Promise<void> {
    //     try {
    //         const { tagId } = req.params;
    //         const { name, description } = req.body;
    //         const tag = await this.tagManager.updateTag(tagId, { name, description });
    //         res.json(tag);
    //     } catch (error) {
    //         logger.error('Failed to update tag:', error);
    //         res.status(500).json({ error: 'Internal server error' });
    //     }
    // }

    // async deleteTag(req: Request, res: Response): Promise<void> {
    //     try {
    //         const { tagId } = req.params;
    //         await this.tagManager.deleteTag(tagId);
    //         res.status(204).send();
    //     } catch (error) {
    //         logger.error('Failed to delete tag:', error);
    //         res.status(500).json({ error: 'Internal server error' });
    //     }
    // }
} 