import { Socket } from 'socket.io';
import logger from '../../utils/logger';

export class ReconnectionHandler {
    private disconnectedClients = new Map<string, {
        timer: NodeJS.Timeout;
        data: any;
        disconnectedAt: Date;
    }>();

    private readonly BRIEF_DISCONNECT_TIMEOUT = 30000; // 30 seconds
    private readonly LONG_DISCONNECT_TIMEOUT = 900000; // 15 minutes

    handleDisconnect(socket: Socket): void {
        const clientId = socket.data.auth.client_identifier;
        const disconnectedAt = new Date();

        // Clear any existing timers
        this.clearExistingTimers(clientId);

        // Set brief disconnect timer
        const briefTimer = setTimeout(() => {
            this.handleBriefDisconnectTimeout(clientId);
        }, this.BRIEF_DISCONNECT_TIMEOUT);

        // Store client data
        this.disconnectedClients.set(clientId, {
            timer: briefTimer,
            data: socket.data,
            disconnectedAt
        });

        logger.info(`Client disconnected: ${clientId}`);
    }

    async handleReconnect(socket: Socket): Promise<boolean> {
        const clientId = socket.data.auth.client_identifier;
        const clientData = this.disconnectedClients.get(clientId);

        if (!clientData) {
            return false;
        }

        const disconnectDuration = Date.now() - clientData.disconnectedAt.getTime();

        if (disconnectDuration < this.BRIEF_DISCONNECT_TIMEOUT) {
            await this.restoreSession(socket, clientData.data);
            this.clearExistingTimers(clientId);
            this.disconnectedClients.delete(clientId);
            return true;
        }

        return false;
    }

    private handleBriefDisconnectTimeout(clientId: string): void {
        const clientData = this.disconnectedClients.get(clientId);
        if (!clientData) return;

        // Set long disconnect timer
        const longTimer = setTimeout(() => {
            this.handleLongDisconnectTimeout(clientId);
        }, this.LONG_DISCONNECT_TIMEOUT - this.BRIEF_DISCONNECT_TIMEOUT);

        this.disconnectedClients.set(clientId, {
            ...clientData,
            timer: longTimer
        });
    }

    private handleLongDisconnectTimeout(clientId: string): void {
        this.disconnectedClients.delete(clientId);
        logger.info(`Client session expired: ${clientId}`);
    }

    private async restoreSession(socket: Socket, data: any): Promise<void> {
        socket.data = data;
        // Restore subscriptions and other session data
        logger.info(`Session restored for client: ${socket.data.auth.client_identifier}`);
    }

    private clearExistingTimers(clientId: string): void {
        const existing = this.disconnectedClients.get(clientId);
        if (existing) {
            clearTimeout(existing.timer);
        }
    }
} 