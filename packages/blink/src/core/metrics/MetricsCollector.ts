import { RedisStorage } from '../../storage/repositories/RedisStorage';
import logger from '../../utils/logger';

export class MetricsCollector {
    constructor(private storage: RedisStorage) {}

    async recordConnection(clientId: string): Promise<void> {
        try {
            await this.storage.incrementCounter('metrics:connections:total');
            await this.storage.incrementCounter(`metrics:connections:active`);
        } catch (error) {
            logger.error('Failed to record connection metric:', error);
        }
    }

    async recordDisconnection(clientId: string): Promise<void> {
        try {
            await this.storage.decrementCounter(`metrics:connections:active`);
        } catch (error) {
            logger.error('Failed to record disconnection metric:', error);
        }
    }

    async recordMessageDelivery(groupId: string): Promise<void> {
        try {
            await this.storage.incrementCounter('metrics:messages:total');
            await this.storage.incrementCounter(`metrics:messages:group:${groupId}`);
        } catch (error) {
            logger.error('Failed to record message delivery metric:', error);
        }
    }

    async getMetrics(): Promise<any> {
        try {
            const [totalConnections, activeConnections, totalMessages] = await Promise.all([
                this.storage.getCounter('metrics:connections:total'),
                this.storage.getCounter('metrics:connections:active'),
                this.storage.getCounter('metrics:messages:total')
            ]);

            return {
                connections: {
                    total: totalConnections,
                    active: activeConnections
                },
                messages: {
                    total: totalMessages
                }
            };
        } catch (error) {
            logger.error('Failed to get metrics:', error);
            throw error;
        }
    }
} 