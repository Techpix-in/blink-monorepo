import { RedisStorage } from '@/storage/repositories/RedisStorage';
import { Message, Acknowledgment } from '../../interfaces/message.interface';
import logger from '../../utils/logger';

export class MessageQueue {
    private queues: Map<string, Message[]> = new Map();
    private processing: Map<string, boolean> = new Map();
    private readonly RETRY_LIMIT = 3;
    private readonly ACK_TIMEOUT = 5000; // 5 seconds

    constructor(
        private storage: RedisStorage,
        private messageManager: MessageManager
    ) {}

    async enqueue(clientId: string, message: Message): Promise<void> {
        let queue = this.queues.get(clientId);
        if (!queue) {
            queue = [];
            this.queues.set(clientId, queue);
        }

        queue.push(message);
        await this.storage.saveMessage(clientId, message);

        if (!this.processing.get(clientId)) {
            this.processQueue(clientId);
        }
    }

    async handleAcknowledgment(clientId: string, ack: Acknowledgment): Promise<void> {
        const queue = this.queues.get(clientId);
        if (!queue) return;

        const messageIndex = queue.findIndex(msg => msg.eventId === ack.eventId);
        if (messageIndex !== -1) {
            queue.splice(messageIndex, 1);
            await this.storage.removeMessage(clientId, ack.eventId);
            this.processQueue(clientId);
        }
    }

    private async processQueue(clientId: string): Promise<void> {
        const queue = this.queues.get(clientId);
        if (!queue || queue.length === 0 || this.processing.get(clientId)) {
            return;
        }

        this.processing.set(clientId, true);
        const message = queue[0];

        try {
            await this.sendMessage(clientId, message);
        } catch (error) {
            logger.error(`Failed to send message to client ${clientId}:`, error);
            await this.handleFailedDelivery(clientId, message);
        }
    }

    private async sendMessage(clientId: string, message: Message): Promise<void> {
        // Implementation will be provided by MessageRouter
        // This is a placeholder for the actual sending mechanism
    }

    private async handleFailedDelivery(clientId: string, message: Message): Promise<void> {
        const retryCount = (message as any).retryCount || 0;
        if (retryCount >= this.RETRY_LIMIT) {
            const queue = this.queues.get(clientId);
            if (queue) {
                queue.shift(); // Remove failed message
                await this.storage.removeMessage(clientId, message.eventId);
                logger.error(`Message ${message.eventId} failed after ${this.RETRY_LIMIT} retries`);
            }
        } else {
            (message as any).retryCount = retryCount + 1;
            setTimeout(() => {
                this.processQueue(clientId);
            }, Math.pow(2, retryCount) * 1000); // Exponential backoff
        }
        this.processing.set(clientId, false);
    }
} 