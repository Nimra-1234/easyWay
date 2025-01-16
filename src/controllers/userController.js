import mongoose from 'mongoose';
import redisClient from '../config/redisClient.js';
import User from '../models/userModel.js';

// Regular expressions for validation
const taxCodeRegex = /^[a-zA-Z0-9]{14}$/;
const emailRegex = /^\S+@\S+\.\S+$/;

const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds
const REDIS_KEYS = {
  user: (taxCode) => `user:${taxCode}`,
  email: (email) => `email:${email}`
};

// Helper function to cache user data
const cacheUserData = async (userData) => {
  const multi = redisClient.multi();
  
  // Cache user data with TTL
  multi.hSet(REDIS_KEYS.user(userData.taxCode), {
    name: userData.name,
    taxCode: userData.taxCode,
    contact: userData.contact,
    createdAt: userData.createdAt.toISOString(),
    updatedAt: userData.updatedAt ? userData.updatedAt.toISOString() : '0'
  });
  multi.expire(REDIS_KEYS.user(userData.taxCode), CACHE_DURATION);
  
  // Cache email lookup with TTL
  multi.set(REDIS_KEYS.email(userData.contact), userData.taxCode);
  multi.expire(REDIS_KEYS.email(userData.contact), CACHE_DURATION);
  
  await multi.exec();
};

export const createUser = async (req, res) => {
  console.log('Received request body:', req.body);
  const { name, taxCode, contact } = req.body;

  try {
    // Validation
    if (!name || !taxCode || !contact) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!taxCodeRegex.test(taxCode)) {
      return res.status(400).json({ error: 'Invalid tax code format' });
    }

    if (!emailRegex.test(contact)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists in MongoDB
    const existingUser = await User.findOne({ $or: [{ taxCode }, { contact }] });
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.taxCode === taxCode ? 
          'Tax code already exists' : 
          'Email already exists' 
      });
    }

    // Create new user in MongoDB
    const user = new User({
      name,
      taxCode,
      contact,
      createdAt: new Date(),
      totalTickets: 0
    });

    await user.save();
    console.log('User saved to MongoDB:', user);

    // Cache in Redis
    try {
      await redisClient.hSet(`user:${taxCode}`, {
        name,
        taxCode,
        contact,
        createdAt: new Date().toISOString(),
        totalTickets: '0'
      });
      await redisClient.expire(`user:${taxCode}`, CACHE_DURATION);
      
      // Cache email lookup
      await redisClient.set(`email:${contact}`, taxCode);
      await redisClient.expire(`email:${contact}`, CACHE_DURATION);
    } catch (redisError) {
      console.error('Redis caching error:', redisError);
      // Continue even if Redis caching fails
    }

    res.status(201).json({ 
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
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};


export const updateUser = async (req, res) => {
  const { taxCode } = req.params;
  const { name, contact } = req.body;

  try {
    // Find and update user in MongoDB
    const user = await User.findOne({ taxCode });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = {};
    const updateMessages = [];

    if (name && name !== user.name) {
      updates.name = name;
      updateMessages.push(`Name updated from "${user.name}" to "${name}"`);
    }

    if (contact && contact !== user.contact) {
      if (await User.findOne({ contact })) {
        return res.status(400).json({ 
          error: 'Email already associated with another user.' 
        });
      }
      updates.contact = contact;
      updateMessages.push(`Contact updated from "${user.contact}" to "${contact}"`);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'No changes required',
        note: 'The provided values are the same as the existing values'
      });
    }

    updates.updatedAt = new Date();

    // Update MongoDB
    const updatedUser = await User.findOneAndUpdate(
      { taxCode },
      updates,
      { new: true }
    );

    // Update Redis cache
    await cacheUserData(updatedUser);

    // If email was updated, remove old email lookup
    if (updates.contact) {
      await redisClient.del(REDIS_KEYS.email(user.contact));
    }

    res.status(200).json({
      message: 'User details updated successfully',
      updates: updateMessages,
      updatedFields: Object.keys(updates).filter(key => key !== 'updatedAt')
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUser = async (req, res) => {
  const { taxCode } = req.params;

  try {
    // Try Redis cache first
    const cachedUser = await redisClient.hGetAll(REDIS_KEYS.user(taxCode));

    if (Object.keys(cachedUser).length > 0) {
      return res.status(200).json(cachedUser);
    }

    // If not in cache, get from MongoDB
    const user = await User.findOne({ taxCode });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cache the user data
    await cacheUserData(user);

    res.status(200).json(user);

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

    // Delete from MongoDB
    await User.deleteOne({ taxCode });

    // Delete from Redis cache
    await redisClient.del(REDIS_KEYS.user(taxCode));
    await redisClient.del(REDIS_KEYS.email(user.contact));

    res.status(200).json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Optional: Background job to clean up old cache entries
const cleanupOldCache = async () => {
  try {
    const userKeys = await redisClient.keys('user:*');
    const emailKeys = await redisClient.keys('email:*');
    
    for (const key of [...userKeys, ...emailKeys]) {
      const ttl = await redisClient.ttl(key);
      if (ttl <= 0) {
        await redisClient.del(key);
      }
    }
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupOldCache, 60 * 60 * 1000);




