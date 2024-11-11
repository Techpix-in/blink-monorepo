import { Server, Socket } from 'socket.io';
import { WebhookAuthenticator } from '../authentication/WebhookAuthenticator';
import { ConnectedClient } from '@/types/client';
import { UserWithoutGroupsAndTags } from '@/interfaces/user.interface';
import { GroupManager } from '../groups/GroupManager';
import { ConnectionConfig } from '@/config/app.config';
import { UserRepository } from '../users/UserRepository';

export class ConnectionManager {
    private readonly activeConnections: Map<string, Socket> = new Map();
    private disconnectionTimeout: NodeJS.Timeout | null = null;

    constructor(
        private readonly io: Server,
        private readonly connectionConfig: ConnectionConfig,
        private readonly authenticator: WebhookAuthenticator,
        private readonly userRepository: UserRepository,
        private readonly groupManager: GroupManager,
    ) {
        this.setupConnectionHandlers();
    }

    private setupConnectionHandlers(): void {
        this.io.on('connection', async (socket: Socket) => {
            try {
                const token = socket.handshake.auth.token;
                console.debug('Token received:', token);
                if (!token) {
                    socket.disconnect(true);
                    return;
                }

                const authResult = await this.authenticator.authenticate(token);
                if (!authResult.success || !authResult.data) {
                    socket.disconnect(true);
                    return;
                }

                const { client_identifier, permissions, groups } = authResult.data;
                

                // Check for existing connection
                const existingUser = await this.userRepository.get(client_identifier);
                if (existingUser?.disconnectedAt) {
                    await this.handleReconnection(socket, existingUser, {
                        id: socket.id,
                        clientIdentifier: client_identifier,
                        permissions,
                        groups
                    });
                } else {
                    const clientData = {
                        id: socket.id,
                        clientIdentifier: client_identifier,
                        permissions,
                        groups,
                        tags: [],
                    };
                    await this.handleNewConnection(socket, clientData);
                }
                
                this.setupClientEventHandlers(
                    socket, 
                    {
                        userId: client_identifier, 
                        groups,
                        permissions
                    });
            } catch (error) {
                console.error('Error handling connection:', error);
                socket.disconnect(true);
            }
        });
    }

    private async handleNewConnection(
        socket: Socket, 
        clientData: Omit<ConnectedClient, 'socket'>
    ): Promise<void> {
        await this.userRepository.save({
            connectionId: socket.id,
            identifier: clientData.clientIdentifier,
            tags: clientData.permissions,
            groups: clientData.groups,
            createdAt: new Date()
        }, {
            expiryTime: this.connectionConfig.inactiveTimeout
        });
        this.activeConnections.set(socket.id, socket);
        for (const group of clientData.groups) {
            await this.groupManager.joinGroup(group, socket.id);
            socket.join(this.groupManager.getGroupChannelKey(group));
            socket.join(this.userRepository.getUserChannelKey(clientData.clientIdentifier));

        }
        socket.emit('connection:success', {
            connectionId: socket.id,
            identifier: clientData.clientIdentifier,
            groups: clientData.groups,
            permissions: clientData.permissions
        });
    }

    private async handleReconnection(
        socket: Socket, 
        existingUser: UserWithoutGroupsAndTags,
        clientData: Omit<ConnectedClient, 'socket'>
    ): Promise<void> {
        const disconnectDuration = Date.now() - existingUser.disconnectedAt!.getTime();
        if (disconnectDuration < this.connectionConfig.inactiveTimeout) {
            // Handle reconnection before inactivity timeout
            const updatedUser = {
                ...existingUser,
                connectionId: socket.id,
                disconnectedAt: undefined,
                groups: clientData.groups,
                tags: clientData.permissions
            };
            await this.userRepository.save(updatedUser);
            this.activeConnections.set(socket.id, socket);
            if (this.disconnectionTimeout) {
                clearTimeout(this.disconnectionTimeout);
            }
            socket.emit('connection:restored', {
                connectionId: socket.id,
                identifier: clientData.clientIdentifier,
                groups: clientData.groups,
                permissions: clientData.permissions
            });
        } else {
            // Session expired - create new session
            socket.disconnect(true);
            await this.handleClientDisconnection(socket, clientData);
        }
    }

    private async handleClientDisconnection(socket: Socket, clientData: Omit<ConnectedClient, 'socket'>): Promise<void> {
        this.activeConnections.delete(socket.id);
        await this.userRepository.delete(clientData.clientIdentifier, socket.id);
        for (const group of clientData.groups) {
            await this.groupManager.leaveGroup(group, socket.id);
            socket.leave(this.groupManager.getGroupChannelKey(group));
        }
        //TODO: flush user message queue
        
    }

    private setupClientEventHandlers(
        socket: Socket, 
        {userId, groups, permissions}: {userId: string, groups: string[], permissions: string[]}
    ): void {
        
        
        const engineSocket = socket.conn;
        engineSocket.on('ping', () => {
            console.log(`Ping received from client for user ${userId}`);
        });
        engineSocket.on('pong', (latency) => {
            console.log(`Pong received from client, latency: ${latency}ms`);
            this.userRepository.setUserExpiry(userId, socket.id, this.connectionConfig.inactiveTimeout);
        });
        
        socket.on('disconnect', async (reason) => {
            const user = await this.userRepository.get(userId);
            if (reason === "ping timeout") {
                console.log(`Connection lost for user ${userId} due to heartbeat failure`);
                if (user) {
                    await this.userRepository.updateDisconnectedAt(userId);
                }
                //set timeout to perform client disconnection. store it to be cleared later if reconnection occurs
                this.disconnectionTimeout = setTimeout(async () => {
                    await this.handleClientDisconnection(socket, {
                        id: socket.id,
                        clientIdentifier: userId,
                        permissions,
                        groups
                    });
                }, this.connectionConfig.inactiveTimeout);
            } else {
                console.log(`Connection explicitly closed for user ${userId}`);
                if (user) {
                    await this.handleClientDisconnection(socket, {
                        id: socket.id,
                        clientIdentifier: user.identifier,
                        permissions,
                        groups
                    });
                }   
            }
        });
    }
} 