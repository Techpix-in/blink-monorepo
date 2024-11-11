import { Server } from 'socket.io';
import { Message } from '@/interfaces/message.interface';
import { GroupManager } from '@/core/groups/GroupManager';
import { UserManager } from '../users/UserManager';
import logger from '../../utils/logger';

export class MessageRouter {
    constructor(
        private readonly io: Server,
        private readonly groupManager: GroupManager,
        private readonly userManager: UserManager
    ) {}

    async sendMessage(options: {
        groupId: string,
        message: Message,
        requireAck?: boolean
    }): Promise<void> {
        const { groupId, message, requireAck = false } = options;
        const ACK_TIMEOUT = 2000; // 2 seconds max wait

        try {
            const group = await this.groupManager.getOrCreateGroup(groupId);
            if (!group) {
                throw new Error(`Failed to get or create group: ${groupId}`);
            }

            const groupChannel = this.groupManager.getGroupChannelKey(groupId);
            const sockets = await this.io.in(groupChannel).fetchSockets();
            const clientIds = sockets.map(socket => socket.id);
            logger.debug(`Sending message to ${clientIds.length} clients in group ${groupId}`);
            if (clientIds.length <= 0){
                console.log(`No clients found in group ${groupId}`);
                return;
            }
            const clientUsers = await this.userManager.bulkFindByConnectionIds(clientIds);
            // Object.values(clientUsers).map(user => console.log(`Client ${JSON.stringify(user)} found in group ${groupId}`));
            // return;
            const usersTagsMap = await this.userManager.getBulkUserTags(
                Object.values(clientUsers)
                .map(user => user?.identifier)
                .filter((identifier): identifier is string => Boolean(identifier))
            );

            // Parallel emission to all eligible clients
            const emitPromises = sockets.map(async (socket) => {
                const clientId = socket.id;
                const clientUser = clientUsers[clientId];
                logger.debug(`Client ${clientId} for user ${clientUser?.identifier} found in group ${groupId}`);
                if (!clientUser) return;

                if (this.isMessageEligibleForClient(
                    message.tags,
                    new Set(usersTagsMap[clientUser.identifier] || []))
                ) {
                    const userChannel = this.userManager.getUserChannelKey(clientUser.identifier);
                    if (!requireAck) {
                        // Fast path - no acknowledgment needed
                        console.log(`Emitting message to ${userChannel}`, message);
                        this.io.to(userChannel).emit(message.event, { eventId: message.eventId, data: message.data });
                        return;
                    }
                    try {
                        await Promise.race([
                            new Promise((resolve, reject) => {
                                this.io.timeout(ACK_TIMEOUT)
                                    .to(userChannel)
                                    .emit(message.event, { eventId: message.eventId, data: message.data }, (err: Error | null, ack: any) => {
                                        if (err) reject(err);
                                        else resolve(ack);
                                    });
                            }),
                            // Prevent memory leaks from stuck promises
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Ack timeout')), ACK_TIMEOUT + 100)
                            )
                        ]);
                    } catch (error) {
                        // Log failed delivery but don't block other messages
                        console.warn(`Message delivery failed for user ${clientUser.identifier}:`, error);
                    }
                }
            });

            // Wait for all emissions to complete
            await Promise.all(emitPromises);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    private isMessageEligibleForClient(messageTags: string[], clientUserTags: Set<string>): boolean {
        const intersection: string[] = messageTags.filter(tag => clientUserTags.has(tag))
        return intersection.length === messageTags.length;
    }
} 