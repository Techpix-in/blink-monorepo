export interface AuthRequest {
    auth_type: string;
    token_type: string;
    token: string;
}

export interface AuthResponse {
    success: boolean;
    data?: {
        client_identifier: string;
        permissions: string[];
        groups: string[];
    };
} 