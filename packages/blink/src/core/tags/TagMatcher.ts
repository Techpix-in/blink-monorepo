export class TagMatcher {
    isSubset(eventTags: string[], userTags: string[]): boolean {
        // Convert arrays to Sets for efficient lookup
        const userTagSet = new Set(userTags);
        
        // Check if all event tags are present in user tags
        return eventTags.every(tag => userTagSet.has(tag));
    }

    validateTags(tags: string[]): boolean {
        return Array.isArray(tags) && 
               tags.every(tag => typeof tag === 'string' && tag.length > 0);
    }
} 