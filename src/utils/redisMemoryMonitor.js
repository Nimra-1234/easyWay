// In utils/redisMemoryMonitor.js
import redisClient from '../config/redisClient.js';

const MAX_USERS_IN_CACHE = 6;  // Set back to 6000 for production
const BATCH_SIZE = 100;

const REDIS_KEYS = {
    user: (taxCode) => `user:${taxCode}`,
    email: (contact) => `email:${contact}`,
    userList: 'cached_users_list'
};

class RedisMemoryMonitor {
    async checkAndMigrateUsers() {
        try {
            const cachedUsersCount = await redisClient.lLen(REDIS_KEYS.userList);
            console.log(`Current cached users: ${cachedUsersCount}`);

            // If we reach the threshold, clear all Redis cache
            if (cachedUsersCount >= MAX_USERS_IN_CACHE) {
                console.log('Cache threshold reached, clearing all Redis cache');
                await this.clearAllCache();
            }
        } catch (error) {
            console.error('Error in checkAndMigrateUsers:', error);
        }
    }

    async clearAllCache() {
        try {
            // Get all user keys and email keys
            const userKeys = await redisClient.keys('user:*');
            const emailKeys = await redisClient.keys('email:*');

            const multi = redisClient.multi();

            // Delete all user data
            for (const key of userKeys) {
                multi.del(key);
            }

            // Delete all email lookups
            for (const key of emailKeys) {
                multi.del(key);
            }

            // Clear the tracking list
            multi.del(REDIS_KEYS.userList);

            await multi.exec();
            console.log('Successfully cleared Redis cache');
        } catch (error) {
            console.error('Error clearing cache:', error);
            throw error;
        }
    }
}

export const monitorRedisMemory = new RedisMemoryMonitor();