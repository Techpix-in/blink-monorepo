import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';

export function createAuditRoutes(auditController: AuditController): Router {
    const router = Router();

    router.get('/user-tags/:userId', auditController.getUserTagHistory);
    router.get('/user-events/:userId', auditController.getUserEventHistory);
    router.get('/event-delivery/:eventId', auditController.getEventDeliveryHistory);

    return router;
} 