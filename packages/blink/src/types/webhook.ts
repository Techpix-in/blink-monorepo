export interface WebhookAuthRequest {
  auth_type: 'TOKEN_AUTH';
  token_type: 'JWT';
  token: string;
}

export interface WebhookAuthResponse {
  success: boolean;
  data?: {
    client_identifier: string;
    permissions: string[];
    groups: string[];
  };
} 