import { io, Socket } from 'socket.io-client';
import { BlinkApp } from '../../src/app';
import { appConfig } from '../../src/config/app.config';

describe('Client Connection E2E', () => {
    let app: BlinkApp;
    let client: Socket;

    beforeAll(async () => {
        app = new BlinkApp();
        app.start();
    });

    afterAll(async () => {
        await app.stop();
    });

    afterEach(() => {
        if (client) {
            client.disconnect();
        }
    });

    it('should connect with valid authentication', (done) => {
        client = io(`http://localhost:${appConfig.port}`, {
            auth: {
                token: 'valid-test-token'
            }
        });

        client.on('connect', () => {
            expect(client.connected).toBe(true);
            done();
        });
    });
}); 