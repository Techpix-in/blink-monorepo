import axios, { AxiosInstance } from 'axios';
import { WebhookAuthRequest, WebhookAuthResponse } from '@/types/webhook';

export class WebhookAuthenticator {
    private readonly axiosInstance: AxiosInstance;
    private readonly authType;
    private readonly options;

    constructor(
        webhookUrl: string, 
        authType: 'TOKEN_AUTH' = 'TOKEN_AUTH', 
        options: { tokenType?: 'JWT' } = {}
    ) {
        this.axiosInstance = axios.create({
            baseURL: webhookUrl,
            timeout: 5000
        });
        this.authType = authType;
        this.options = options;
    }

    async authenticate(token: string): Promise<WebhookAuthResponse> {
        try {
            const request: WebhookAuthRequest = {
                auth_type: this.authType,
                token_type: this.options.tokenType || 'JWT',
                token
            };

            const response = await this.axiosInstance.post<WebhookAuthResponse>('', request);
            
            if (response.status !== 200) {
                return { success: false };
            }

            return response.data;
        } catch (error) {
            console.error('Webhook authentication failed:', error);
            return { success: false };
        }
    }
} 