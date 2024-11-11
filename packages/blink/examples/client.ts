import { io, Socket } from 'socket.io-client';

class TestClient {
    private socket: Socket;

    constructor(serverUrl: string = 'http://localhost:3000') {
        this.socket = io(serverUrl, {
            auth: {
                token: 'your-auth-token' // If you're using token authentication
            },
            reconnection: true,
            reconnectionAttempts: 5,
            timeout: 10000
        });

        // Basic event handlers
        this.socket.on('connect', () => {
            console.log('Connected to server', this.socket.id);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        // // Handle incoming messages
        // this.socket.onAny((event, message) => {
        //     console.log(`Received event ${event} message: ${JSON.stringify(message)}`);
        //     // If acknowledgment is required
        //     // return { received: true };
        // });

        this.socket.on('update', (message) => {
            console.log(`Received message: ${JSON.stringify(message)} at ${Date.now()}`);
            // If acknowledgment is required
            // return { received: true };
        });

        // Handle server shutdown
        this.socket.on('shutdown', () => {
            console.log('Server is shutting down');
        });
    }

    // Method to join a group
    // public joinGroup(groupId: string): void {
    //     this.socket.emit('join-group', { groupId }, (response: any) => {
    //         console.log('Joined group response:', response);
    //     });
    // }

    // Method to disconnect
    public disconnect(): void {
        this.socket.disconnect();
    }
}

// Usage example
async function main() {
    const client = new TestClient();

    // // Join a group after connection
    // setTimeout(() => {
    //     client.joinGroup('test-group');
    // }, 1000);

    // Keep the process running
    process.on('SIGINT', () => {
        console.log('Cleaning up...');
        client.disconnect();
        process.exit(0);
    });
}

main().catch(console.error); 