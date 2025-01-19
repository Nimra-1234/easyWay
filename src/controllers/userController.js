import mongoose from 'mongoose';
import redisClient from '../config/redisClient.js';
import User from '../models/userModel.js';
import { monitorRedisMemory } from '../utils/redisMemoryMonitor.js';

const taxCodeRegex = /^[a-zA-Z0-9]{14}$/;
const emailRegex = /^\S+@\S+\.\S+$/;
const MAX_USERS_IN_CACHE = 6000;

const REDIS_KEYS = {
    user: (taxCode) => `user:${taxCode}`,
    email: (email) => `email:${email}`,
    userList: 'cached_users_list'
};

const cacheUserData = async (userData) => {
    try {
        await monitorRedisMemory.checkAndMigrateUsers();

        const multi = redisClient.multi();
        
        multi.hSet(REDIS_KEYS.user(userData.taxCode), {
            name: userData.name,
            taxCode: userData.taxCode,
            contact: userData.contact,
            createdAt: userData.createdAt.toISOString(),
            updatedAt: userData.updatedAt ? userData.updatedAt.toISOString() : userData.createdAt.toISOString(),
            totalTickets: userData.totalTickets?.toString() || '0'
        });

        multi.set(REDIS_KEYS.email(userData.contact), userData.taxCode);
        multi.rPush(REDIS_KEYS.userList, userData.taxCode);

        await multi.exec();
        return { success: true };
    } catch (error) {
        console.error('Redis caching error:', error);
        return { success: false };
    }
};

export const createUser = async (req, res) => {
    const { name, taxCode, contact } = req.body;
    try {
        if (!name || !taxCode || !contact) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!taxCodeRegex.test(taxCode)) {
            return res.status(400).json({ error: 'Invalid tax code format' });
        }
        if (!emailRegex.test(contact)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const existingUser = await User.findOne({ $or: [{ taxCode }, { contact }] });
        if (existingUser) {
            return res.status(400).json({ 
                error: existingUser.taxCode === taxCode ? 
                    'Tax code already exists' : 
                    'Email already exists' 
            });
        }

        const now = new Date();
        const user = new User({
            name,
            taxCode,
            contact,
            createdAt: now,
            updatedAt: now,
            totalTickets: 0
        });
        await user.save();

        await cacheUserData(user);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                name,
                taxCode,
                contact,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                totalTickets: 0
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateUser = async (req, res) => {
    const { taxCode } = req.params;
    const { name, contact } = req.body;
    try {
        const user = await User.findOne({ taxCode });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updates = {};
        if (name && name !== user.name) updates.name = name;
        if (contact && contact !== user.contact) {
            if (await User.findOne({ contact })) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            updates.contact = contact;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No changes provided' });
        }

        updates.updatedAt = new Date();

        const updatedUser = await User.findOneAndUpdate(
            { taxCode },
            updates,
            { new: true }
        );

        if (updates.contact) {
            await redisClient.del(REDIS_KEYS.email(user.contact));
        }
        
        await cacheUserData(updatedUser);

        res.json({
            success: true,
            message: 'User updated successfully',
            user: {
                name: updatedUser.name,
                taxCode: updatedUser.taxCode,
                contact: updatedUser.contact,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt,
                totalTickets: updatedUser.totalTickets
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getUser = async (req, res) => {
    const { taxCode } = req.params;
    try {
        const cachedUser = await redisClient.hGetAll(REDIS_KEYS.user(taxCode));
        if (Object.keys(cachedUser).length > 0) {
            // Parse dates back to Date objects for consistent response
            const user = {
                ...cachedUser,
                createdAt: new Date(cachedUser.createdAt),
                updatedAt: new Date(cachedUser.updatedAt),
                totalTickets: parseInt(cachedUser.totalTickets)
            };
            return res.json({ 
                success: true, 
                user,
                source: 'cache'
            });
        }

        const user = await User.findOne({ taxCode });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await cacheUserData(user);
        res.json({ 
            success: true, 
            user: {
                name: user.name,
                taxCode: user.taxCode,
                contact: user.contact,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                totalTickets: user.totalTickets
            },
            source: 'database'
        });
    } catch (error) {
        console.error('Error retrieving user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteUser = async (req, res) => {
    const { taxCode } = req.params;
    try {
        const user = await User.findOne({ taxCode });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await User.deleteOne({ taxCode });
        await redisClient.del(REDIS_KEYS.user(taxCode));
        await redisClient.del(REDIS_KEYS.email(user.contact));
        await redisClient.lRem(REDIS_KEYS.userList, 0, taxCode);

        res.json({ 
            success: true, 
            message: 'User deleted successfully',
            deletedAt: new Date()
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getLuckyDrawEligibleUsers = async (req, res) => {
    try {
        const TICKET_THRESHOLD = 200;
        const users = await User.aggregate([
            {
                $project: {
                    _id: 0,
                    name: 1,
                    taxCode: 1,
                    contact: 1,
                    totalTickets: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    luckyDrawStatus: {
                        isEligible: { $gte: ["$totalTickets", TICKET_THRESHOLD] },
                        ticketsNeeded: {
                            $max: [{ $subtract: [TICKET_THRESHOLD, "$totalTickets"] }, 0]
                        }
                    }
                }
            },
            { $sort: { totalTickets: -1 } }
        ]);

        res.json({
            success: true,
            totalUsers: users.length,
            threshold: TICKET_THRESHOLD,
            data: users,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error in getLuckyDrawEligibleUsers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const checkUserEligibility = async (req, res) => {
    try {
        const { taxCode } = req.params;
        const TICKET_THRESHOLD = 200;

        const userEligibility = await User.aggregate([
            {
                $match: {
                    taxCode: taxCode
                }
            },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    taxCode: 1,
                    contact: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    totalTickets: { $ifNull: ["$totalTickets", 0] },
                    eligibilityStatus: {
                        isEligible: { 
                            $gte: [{ $ifNull: ["$totalTickets", 0] }, TICKET_THRESHOLD] 
                        },
                        currentTickets: { $ifNull: ["$totalTickets", 0] },
                        ticketsNeeded: {
                            $max: [
                                { 
                                    $subtract: [
                                        TICKET_THRESHOLD, 
                                        { $ifNull: ["$totalTickets", 0] }
                                    ] 
                                },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        if (!userEligibility || userEligibility.length === 0) {
            return res.status(404).json({
                success: false,
                message: `User with tax code ${taxCode} not found`
            });
        }

        res.json({
            success: true,
            data: userEligibility[0],
            checkedAt: new Date()
        });

    } catch (error) {
        console.error("Error checking user eligibility:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
};