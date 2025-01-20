import redisClient from '../config/redisClient.js';
import User from '../models/userModel.js';
import { v4 as uuidv4 } from 'uuid';
import { monitorRedisMemory } from '../utils/redisMemoryMonitor.js';

const TICKET_EXPIRY_SECONDS = 70 * 60; // 70 minutes in seconds

const REDIS_KEYS = {
    ticket: (ticketId) => `ticket:${ticketId}`,
    userActiveTickets: (taxCode) => `user:${taxCode}:active_tickets`,
    user: (taxCode) => `user:${taxCode}`,
    email: (email) => `email:${email}`,
    userList: 'cached_users_list'
};

export const createTicket = async (req, res) => {
    const { taxCode, routeId, tripId } = req.body;

    try {
        // First check Redis cache
        let user;
        const cachedUser = await redisClient.hGetAll(REDIS_KEYS.user(taxCode));
        
        if (Object.keys(cachedUser).length > 0) {
            user = {
                ...cachedUser,
                totalTickets: parseInt(cachedUser.totalTickets)
            };
        } else {
            // If not in cache, get from MongoDB
            user = await User.findOne({ taxCode });
            if (!user) {
                return res.status(404).json({ error: 'User not found. Please register first.' });
            }
            
            // Cache user data if found
            await monitorRedisMemory.checkAndMigrateUsers();
            if (user) {
                const multi = redisClient.multi();
                multi.hSet(REDIS_KEYS.user(user.taxCode), {
                    name: user.name,
                    taxCode: user.taxCode,
                    contact: user.contact,
                    createdAt: user.createdAt.toISOString(),
                    updatedAt: user.updatedAt.toISOString(),
                    totalTickets: user.totalTickets.toString()
                });
                multi.rPush(REDIS_KEYS.userList, user.taxCode);
                await multi.exec();
            }
        }

        // Only proceed with ticket creation if we have a valid user
        if (!user) {
            return res.status(404).json({ error: 'Invalid user state' });
        }

        const ticketId = uuidv4();
        const now = new Date();
        const expirationTime = new Date(now.getTime() + TICKET_EXPIRY_SECONDS * 1000);
        
        const ticket = {
            ticketId,
            userId: taxCode,
            routeId,
            tripId,
            userName: user.name,
            status: 'active',
            createdAt: now.toISOString(),
            expired_at: expirationTime.toISOString()
        };

        // Use Redis transaction for atomic operations
        const multi = redisClient.multi();
        
        try {
            // Store ticket with TTL
            multi.hSet(REDIS_KEYS.ticket(ticketId), ticket);
            multi.expire(REDIS_KEYS.ticket(ticketId), TICKET_EXPIRY_SECONDS);
            
            // Add to user's active tickets set with same TTL
            multi.sAdd(REDIS_KEYS.userActiveTickets(taxCode), ticketId);
            multi.expire(REDIS_KEYS.userActiveTickets(taxCode), TICKET_EXPIRY_SECONDS);
            
            await multi.exec();

            // Update MongoDB only after successful Redis operations
            const updatedUser = await User.findOneAndUpdate(
                { taxCode },
                { 
                    $inc: { totalTickets: 1 },
                    $set: { 
                        lastTicketAt: now,
                        updatedAt: now 
                    }
                },
                { new: true }
            );

            // Update Redis cache if it exists
            const userInCache = await redisClient.exists(REDIS_KEYS.user(taxCode));
            if (userInCache) {
                await redisClient.hSet(REDIS_KEYS.user(taxCode), {
                    totalTickets: updatedUser.totalTickets.toString(),
                    updatedAt: now.toISOString()
                });
            }

            res.status(201).json({ 
                success: true,
                message: 'Ticket created successfully', 
                ticket,
                expiresIn: `${TICKET_EXPIRY_SECONDS} seconds`
            });
        } catch (error) {
            // Rollback Redis operations if something fails
            await redisClient.del(REDIS_KEYS.ticket(ticketId));
            await redisClient.sRem(REDIS_KEYS.userActiveTickets(taxCode), ticketId);
            throw error;
        }
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
};

export const getUserTickets = async (req, res) => {
    const { taxCode } = req.params;
    
    try {
        // Check Redis cache first
        let user;
        const cachedUser = await redisClient.hGetAll(REDIS_KEYS.user(taxCode));
        
        if (Object.keys(cachedUser).length > 0) {
            user = {
                ...cachedUser,
                totalTickets: parseInt(cachedUser.totalTickets)
            };
        } else {
            user = await User.findOne({ taxCode });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
        }

        const activeTicketIds = await redisClient.sMembers(REDIS_KEYS.userActiveTickets(taxCode));

        res.status(200).json({
            success: true,
            user: {
                name: user.name,
                taxCode: user.taxCode,
                contact: user.contact
            },
            tickets: {
                activeCount: activeTicketIds.length,
                totalPurchased: user.totalTickets || 0,
                activeTicketIds: activeTicketIds
            }
        });
    } catch (error) {
        console.error('Error retrieving user tickets:', error);
        res.status(500).json({ error: 'Failed to retrieve tickets' });
    }
};

export const getTicket = async (req, res) => {
    const { ticketId } = req.params;
    
    try {
        const ticket = await redisClient.hGetAll(REDIS_KEYS.ticket(ticketId));
        
        if (Object.keys(ticket).length === 0) {
            return res.status(404).json({ error: 'Ticket not found or expired' });
        }

        const ttl = await redisClient.ttl(REDIS_KEYS.ticket(ticketId));
        
        res.status(200).json({
            success: true,
            ticket: {
                ...ticket,
                timeRemaining: `${ttl} seconds`
            }
        });
    } catch (error) {
        console.error('Error retrieving ticket:', error);
        res.status(500).json({ error: 'Failed to retrieve ticket' });
    }
};