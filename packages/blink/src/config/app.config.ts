export interface GroupConfig {
    inactiveGroupTimeout: number;
}

export interface ConnectionConfig {
    inactiveTimeout: number;   
}

export interface AppConfig {
    port: number;
    env: string;
    corsOrigins: string[];
    webhookConfig: {
        authEndpoint: string;
        timeout: number;
        retries: number;
    };
    reconnection: {
        briefTimeout: number;    // 30 seconds
        longTimeout: number;     // 15 minutes
    };
    audit: {
        retentionDays: number;
    };
}

export const appConfig: AppConfig = {
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
    webhookConfig: {
        authEndpoint: process.env.AUTH_WEBHOOK_URL || 'http://localhost:4000/webhook/auth',
        timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '5000'),
        retries: parseInt(process.env.WEBHOOK_RETRIES || '3')
    },
    reconnection: {
        briefTimeout: parseInt(process.env.BRIEF_TIMEOUT || '30000'),
        longTimeout: parseInt(process.env.LONG_TIMEOUT || '900000')
    },
    audit: {
        retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90')
    }
}; 