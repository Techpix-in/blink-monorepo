import { Router } from 'express';
import { HealthCheck } from '../../core/health/HealthCheck';

export function createHealthRoutes(healthCheck: HealthCheck): Router {
    const router = Router();

    router.get('/health', async (req, res) => {
        const health = await healthCheck.check();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    });

    return router;
} 