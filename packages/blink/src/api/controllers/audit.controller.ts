import { Request, Response } from 'express';
import { AuditStorage } from '../../storage/audit/AuditStorage';
import logger from '../../utils/logger';

export class AuditController {
    constructor(private auditStorage: AuditStorage) {}

    async getUserTagHistory(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const { startDate, endDate, page = '1', limit = '10' } = req.query;

            const history = await this.auditStorage.getUserTagHistory(
                userId,
                new Date(startDate as string),
                new Date(endDate as string),
                parseInt(page as string),
                parseInt(limit as string)
            );

            res.json({
                userId,
                tagHistory: history,
                page: parseInt(page as string),
                limit: parseInt(limit as string)
            });
        } catch (error) {
            logger.error('Failed to get user tag history:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getEventDeliveryHistory(req: Request, res: Response): Promise<void> {
        try {
            const { eventId } = req.params;
            const { page = '1', limit = '10' } = req.query;

            const history = await this.auditStorage.getEventDeliveryHistory(
                eventId,
                parseInt(page as string),
                parseInt(limit as string)
            );

            res.json({
                eventId,
                deliveryHistory: history,
                page: parseInt(page as string),
                limit: parseInt(limit as string)
            });
        } catch (error) {
            logger.error('Failed to get event delivery history:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
} 