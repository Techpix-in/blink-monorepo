import { Router } from 'express';
import { GroupController } from '../controllers/group.controller';

export function createGroupRoutes(groupController: GroupController): Router {
    const router = Router();

    router.post('/', groupController.createGroup);
    router.get('/', groupController.listGroups);
    router.get('/:groupId', groupController.getGroup);
    router.put('/:groupId', groupController.updateGroup);
    router.delete('/:groupId', groupController.deleteGroup);

    return router;
} 