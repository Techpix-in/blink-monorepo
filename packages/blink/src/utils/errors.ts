export class BlinkError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500
    ) {
        super(message);
        this.name = 'BlinkError';
    }
}

export class AuthenticationError extends BlinkError {
    constructor(message: string = 'Authentication failed') {
        super(message, 'AUTH_ERROR', 401);
    }
}

export class GroupError extends BlinkError {
    constructor(message: string) {
        super(message, 'GROUP_ERROR', 400);
    }
} 