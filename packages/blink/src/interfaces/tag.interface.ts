export interface TagUpdate {
    userId: string;
    timestamp: Date;
    previousTags: string[];
    newTags: string[];
    updateSource: string;
}

export interface TagMatcher {
    isSubset(eventTags: string[], userTags: string[]): boolean;
} 