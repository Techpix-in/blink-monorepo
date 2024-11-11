import { TagMatcher } from '../../src/core/tags/TagMatcher';

describe('TagMatcher', () => {
    let tagMatcher: TagMatcher;

    beforeEach(() => {
        tagMatcher = new TagMatcher();
    });

    describe('isSubset', () => {
        it('should return true when event tags are a subset of user tags', () => {
            const eventTags = ['tag1', 'tag2'];
            const userTags = ['tag1', 'tag2', 'tag3'];
            expect(tagMatcher.isSubset(eventTags, userTags)).toBe(true);
        });

        it('should return true when event tags exactly match user tags', () => {
            const eventTags = ['tag1', 'tag2'];
            const userTags = ['tag1', 'tag2'];
            expect(tagMatcher.isSubset(eventTags, userTags)).toBe(true);
        });

        it('should return false when event tags are not a subset of user tags', () => {
            const eventTags = ['tag1', 'tag2', 'tag4'];
            const userTags = ['tag1', 'tag2', 'tag3'];
            expect(tagMatcher.isSubset(eventTags, userTags)).toBe(false);
        });
    });
}); 