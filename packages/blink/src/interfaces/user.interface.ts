 export interface User {
    connectionId: string;
    identifier: string;
    groups: string[];
    tags: string[];
    createdAt: Date;
    disconnectedAt?: Date;
}
export type UserWithoutGroupsAndTags = Omit<User, 'groups' | 'tags'>;
export interface PaginatedUsers {
    users: UserWithoutGroupsAndTags[];
    metadata: {
        page: number;
        limit: number;
        totalCount: number;
        hasMore: boolean;
    }
}