export interface Group {
    groupId: string;
    groupName: string;
    createdAt: Date;
    expiryTime: number;
    subscriberCount: number;
    lastActivityAt: Date;
}

export interface GroupCreateRequest {
    groupName: string;
    expiryTime: number;
} 