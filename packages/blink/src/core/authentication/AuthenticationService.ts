
import { AuthResponse } from '../../interfaces/auth.interface';
import { AuthenticationError } from '../../utils/errors';
import logger from '../../utils/logger';
import { WebhookAuthenticator } from './WebhookAuthenticator';

export class AuthenticationService {
    constructor(private webhookAuthenticator: WebhookAuthenticator) {}

    async authenticate(token: string): Promise<AuthResponse['data']> {
        try {
            const authResult = await this.webhookAuthenticator.authenticate(token);
            
            if (!authResult.success || !authResult.data) {
                throw new AuthenticationError();
            }

            return authResult.data;
        } catch (error) {
            logger.error('Authentication failed:', error);
            throw new AuthenticationError();
        }
    }
}
