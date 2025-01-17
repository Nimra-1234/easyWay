import mongoose from 'mongoose';
import redisClient from '../config/redisClient.js';
import User from '../models/userModel.js';
import { monitorRedisMemory } from '../utils/redisMemoryMonitor.js';

const taxCodeRegex = /^[a-zA-Z0-9]{14}$/;
const emailRegex = /^\S+@\S+\.\S+$/;
const MAX_USERS_IN_CACHE = 6;

const REDIS_KEYS = {
    user: (taxCode) => `user:${taxCode}`,
    email: (email) => `email:${email}`,
    userList: 'cached_users_list'
};

const cacheUserData = async (userData) => {
  try {
      // Check if we need to clear cache
      await monitorRedisMemory.checkAndMigrateUsers();

      // If cache was cleared, this will be adding to an empty cache
      const multi = redisClient.multi();
      
      // Cache user data
      multi.hSet(`user:${userData.taxCode}`, {
          name: userData.name,
          taxCode: userData.taxCode,
          contact: userData.contact,
          createdAt: userData.createdAt.toISOString(),
          totalTickets: userData.totalTickets?.toString() || '0'
      });

      // Cache email lookup
      multi.set(`email:${userData.contact}`, userData.taxCode);
      
      // Add to tracking list
      multi.rPush('cached_users_list', userData.taxCode);

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
        // 1. Validate input
        if (!name || !taxCode || !contact) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 2. Check existing user
        const existingUser = await User.findOne({ $or: [{ taxCode }, { contact }] });
        if (existingUser) {
            return res.status(400).json({ 
                error: 'User already exists'
            });
        }

        // 3. Create in MongoDB FIRST (Source of Truth)
        const user = new User({
            name,
            taxCode,
            contact,
            createdAt: new Date(),
            totalTickets: 0
        });
        await user.save();

        // 4. Cache in Redis (Performance Layer)
        await cacheUserData(user);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                name,
                taxCode,
                contact,
                createdAt: user.createdAt,
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
        // 1. Find existing user
        const user = await User.findOne({ taxCode });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Prepare updates
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

        // 3. Update in MongoDB
        const updatedUser = await User.findOneAndUpdate(
            { taxCode },
            updates,
            { new: true }
        );

        // 4. Update Redis cache
        if (updates.contact) {
            // Remove old email lookup
            await redisClient.del(REDIS_KEYS.email(user.contact));
        }
        
        // Update cache with new data
        await cacheUserData(updatedUser);

        res.json({
            success: true,
            message: 'User updated successfully',
            user: updatedUser
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
            return res.json({ success: true, user: cachedUser });
        }

        const user = await User.findOne({ taxCode });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await cacheUserData(user);
        res.json({ success: true, user });
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

        res.json({ success: true, message: 'User deleted successfully' });
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
            data: users
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

      console.log('Checking eligibility for taxCode:', taxCode);

      const userEligibility = await User.aggregate([
          // Match the user by taxCode
          {
              $match: {
                  taxCode: taxCode
              }
          },
          // Project the needed fields and calculate eligibility
          {
              $project: {
                  _id: 0,
                  name: 1,
                  taxCode: 1,
                  contact: 1,
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
                      },
                      message: {
                          $cond: {
                              if: { $gte: [{ $ifNull: ["$totalTickets", 0] }, TICKET_THRESHOLD] },
                              then: {
                                  $concat: [
                                      "Congratulations! You're eligible for the lucky draw with ",
                                      { $toString: { $ifNull: ["$totalTickets", 0] } },
                                      " tickets!"
                                  ]
                              },
                              else: {
                                  $let: {
                                      vars: {
                                          needed: {
                                              $subtract: [
                                                  TICKET_THRESHOLD,
                                                  { $ifNull: ["$totalTickets", 0] }
                                              ]
                                          }
                                      },
                                      in: {
                                          $concat: [
                                              "You need ",
                                              { $toString: "$$needed" },
                                              " more tickets to be eligible for lucky draw"
                                          ]
                                      }
                                  }
                              }
                          }
                      }
                  }
              }
          }
      ]);

      console.log('Aggregation result:', userEligibility);

      if (!userEligibility || userEligibility.length === 0) {
          return res.status(404).json({
              success: false,
              message: `User with tax code ${taxCode} not found`
          });
      }

      res.json({
          success: true,
          data: userEligibility[0]
      });

  } catch (error) {
      console.error("Error checking user eligibility:", error);
      res.status(500).json({
          success: false,
          message: "Error checking user eligibility",
          error: error.message
      });
  }
};