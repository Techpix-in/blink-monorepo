import { GroupManager } from '../../src/core/groups/GroupManager';
import { RedisStorage } from '../../src/storage/repositories/RedisStorage';
import { RedisClient } from '../../src/storage/repositories/RedisClient';
import { redisConfig } from '../../src/config/redis.config';

describe('GroupManagement Integration', () => {
    let redisClient: RedisClient;
    let storage: RedisStorage;
    let groupManager: GroupManager;

    beforeAll(async () => {
        redisClient = new RedisClient(redisConfig);
        await redisClient.connect();
        storage = new RedisStorage(redisClient);
        groupManager = new GroupManager(storage);
    });

    afterAll(async () => {
        await redisClient.disconnect();
    });

    afterEach(async () => {
        // Clean up test data
        const client = redisClient.getClient();
        await client.flushDb();
    });

    it('should create and retrieve a group', async () => {
        const groupData = {
            groupName: 'TestGroup',
            expiryTime: 3600000 // 1 hour
        };

        const createdGroup = await groupManager.createGroup(groupData);
        expect(createdGroup.groupName).toBe(groupData.groupName);

        const retrievedGroup = await groupManager.getGroup(createdGroup.groupId);
        expect(retrievedGroup).toMatchObject({
            groupName: groupData.groupName,
            expiryTime: groupData.expiryTime
        });
    });
}); 