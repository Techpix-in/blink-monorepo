import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import { Server, Socket } from 'socket.io';
import { createAdapter } from "@socket.io/redis-streams-adapter";
import { WebhookAuthenticator } from './core/authentication/WebhookAuthenticator';
import { GroupManager } from './core/groups/GroupManager';
import { MessageRouter } from './core/messaging/MessageRouter';
import logger from './utils/logger';
import { ConnectionManager } from './core/connection/ConnectionManager';
import { UserManager } from './core/users/UserManager';
import { AppConfig, ConnectionConfig, GroupConfig } from './config/app.config';
import { RedisClient } from './redis/RedisClient';
import { UserRepository } from './core/users/UserRepository';
import { GroupRepository } from './core/groups/GroupRepository';
import { GroupMembershipRepository } from './core/groups/GroupMembershipRepository';
import { AdminController } from './api/controllers/admin.controller';
// import { TagManager } from './core/tags/TagManager';

export interface BlinkOptions {
    server: HttpServer | HttpsServer;
    heartbeat: {
        interval: number;
        timeout: number;
    };
    redis: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };
    auth: {
        webhookUrl: string;
        authType?: 'TOKEN_AUTH';
        options?: {
            tokenType?: 'JWT';
        };
        timeout?: number;
    };
    cors?: {
        origin: string | string[];
        methods?: string[];
    };
    group?: GroupConfig;
    connection?: ConnectionConfig;
}

export class Blink {
    private io!: Server;
    private redisClient: RedisClient;
    private userManager!: UserManager;
    private groupManager!: GroupManager;
    private messageRouter!: MessageRouter;
    private connectionManager!: ConnectionManager;
    private adminController!: AdminController;
    // private tagManager!: TagManager;

    constructor(private options: BlinkOptions) {
        // Initialize Redis and wait for connection
        this.redisClient = new RedisClient(this.options.redis);
        
        // Wait for Redis to be ready before initializing other components
        this.initialize().catch(error => {
            console.error('Failed to initialize Blink:', error);
            throw error; // Re-throw to let the application handle the error
        });
    }

    private async initialize(): Promise<void> {
        // Wait for Redis connection
        await this.redisClient.connect();

        // Only proceed if Redis is connected
        if (!this.redisClient.isReady()) {
            throw new Error('Redis client failed to initialize');
        }
        this.io = new Server(this.options.server, {
            cors: this.options.cors || {
                origin: '*',
                methods: ['GET', 'POST']
            },
            adapter: createAdapter(this.redisClient.getClient()),
            pingInterval: this.options.heartbeat.interval,
            pingTimeout: this.options.heartbeat.timeout
        });

        // Initialize core components
        const authenticator = new WebhookAuthenticator(this.options.auth.webhookUrl, this.options.auth.authType, this.options.auth.options);
        const userRepository = new UserRepository(this.redisClient);
        const groupRepository = new GroupRepository(this.redisClient);
        const groupMembershipRepository = new GroupMembershipRepository(this.redisClient);
        this.userManager = new UserManager(userRepository);
        this.groupManager = new GroupManager(this.options.group || {} as GroupConfig, groupRepository, groupMembershipRepository);
        // this.tagManager = new TagManager(this.redisClient);
        this.messageRouter = new MessageRouter(this.io, this.groupManager, this.userManager);   
        this.connectionManager = new ConnectionManager(
            this.io, 
            this.options.connection || {} as ConnectionConfig, 
            authenticator, 
            userRepository, 
            this.groupManager
        );

        // Initialize controllers
        this.adminController = new AdminController(
            // this.tagManager,
            this.userManager
        );
    }

    /**
     * Send a message to a specific group
     */
    public async sendMessage(options: {
        groupId: string, 
        event: string, 
        data: any, 
        tags?: string[],
        requireAck?: boolean
    }): Promise<void> {
        await this.messageRouter.sendMessage({
            groupId: options.groupId,
            message: {
                type: 'event',
                eventId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                event: options.event,
                data: options.data,
                tags: options.tags || [],
            },
            requireAck: options.requireAck || false
        });
    }

    /**
     * Create a new group
     */
    // public async createGroup(name: string, expiryTime?: number): Promise<string> {
    //     return await this.groupManager.createGroup({ groupName: name, expiryTime });
    // }

    /**
     * Get instance of Socket.IO server
     */
    public getIO(): Server {
        return this.io;
    }

    /**
     * Cleanup resources
     */
    public async close(timeout: number = 5000): Promise<void> {
        // Start shutdown
        this.io.emit('shutdown');

        // Wait for sockets to drain or timeout
        // await Promise.race([
        //     // Wait for all sockets to drain
        //     Promise.all(
        //         await this.io.sockets.sockets.entries().map(([id, socket]) => 
        //             new Promise<void>(resolve => {
        //                 if (socket.bufferedAmount) {
        //                     resolve();
        //                     return;
        //                 }
        //                 socket.on('drain', () => resolve());
        //             })
        //         )
        //     ),
        //     // Timeout after specified duration
        //     new Promise(resolve => setTimeout(resolve, timeout))
        // ]);

        // Close connections
        await this.redisClient.disconnect();
        this.io.close();
    }

    /**
     * Get admin controller instance
     */
    public getAdminController(): AdminController {
        return this.adminController;
    }
}

// Export types
export * from './interfaces/auth.interface';
export * from './interfaces/group.interface';
export * from './interfaces/message.interface';
export * from './interfaces/tag.interface';

// Default export
export default Blink;