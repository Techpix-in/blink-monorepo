import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';

export function createAdminRoutes(adminController: AdminController): Router {
    const router = Router();

    // User Management
    router.get('/users', adminController.listUsers);
    router.post('/users', adminController.createUser);
    router.get('/users/:userId', adminController.getUser);
    router.put('/users/:userId', adminController.updateUser);
    router.delete('/users/:userId', adminController.deleteUser);

    // Tag Management
    router.get('/tags', adminController.listTags);
    router.post('/tags', adminController.createTag);
    router.get('/tags/:tagId', adminController.getTag);
    router.put('/tags/:tagId', adminController.updateTag);
    router.delete('/tags/:tagId', adminController.deleteTag);

    return router;
} 