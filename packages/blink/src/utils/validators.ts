export const validators = {
    isValidToken: (token: string): boolean => {
        return typeof token === 'string' && token.length > 0;
    },

    isValidGroupName: (name: string): boolean => {
        return typeof name === 'string' && name.length >= 3 && name.length <= 50;
    },

    isValidTags: (tags: string[]): boolean => {
        return Array.isArray(tags) && tags.every(tag => typeof tag === 'string');
    }
}; 