import redisClient from '../config/redisClient.js';
import User from '../models/userModel.js';
import { v4 as uuidv4 } from 'uuid';

const TICKET_EXPIRY_SECONDS = 70 * 60; // 70 minutes in seconds
const REDIS_KEYS = {
    ticket: (ticketId) => `ticket:${ticketId}`,
    userActiveTickets: (taxCode) => `user:${taxCode}:active_tickets`,
    userCache: (taxCode) => `user:${taxCode}`
};

export const createTicket = async (req, res) => {
    const { taxCode, routeId, tripId } = req.body;

    try {
        const user = await User.findOne({ taxCode });
        if (!user) {
            return res.status(404).json({ error: 'User not found. Please register first.' });
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

        // Use Redis multi for atomic operations
        const multi = redisClient.multi();
        
        // Store ticket with TTL
        multi.hSet(REDIS_KEYS.ticket(ticketId), ticket);
        multi.expire(REDIS_KEYS.ticket(ticketId), TICKET_EXPIRY_SECONDS);
        
        // Add to user's active tickets set with same TTL
        multi.sAdd(REDIS_KEYS.userActiveTickets(taxCode), ticketId);
        multi.expire(REDIS_KEYS.userActiveTickets(taxCode), TICKET_EXPIRY_SECONDS);
        
        await multi.exec();

        // Update MongoDB ticket count
        await User.updateOne(
            { taxCode },
            { 
                $inc: { totalTickets: 1 },
                $set: { lastTicketAt: now }
            }
        );

        // Update Redis cache if it exists
        const cachedUser = await redisClient.hGetAll(REDIS_KEYS.userCache(taxCode));
        if (Object.keys(cachedUser).length > 0) {
            await redisClient.hIncrBy(REDIS_KEYS.userCache(taxCode), 'totalTickets', 1);
        }

        res.status(201).json({ 
            message: 'Ticket created successfully', 
            ticket,
            expiresIn: `${TICKET_EXPIRY_SECONDS} seconds`
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
};

export const getUserTickets = async (req, res) => {
    const { taxCode } = req.params;
    
    try {
        // Check if user exists in MongoDB
        const user = await User.findOne({ taxCode });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get active ticket IDs from Redis
        // Redis will automatically remove expired sets, so we only get valid tickets
        const activeTicketIds = await redisClient.sMembers(REDIS_KEYS.userActiveTickets(taxCode));

        res.status(200).json({
            activeTicketCount: activeTicketIds.length,
            totalPurchased: user.totalTickets || 0,
            activeTicketIds: activeTicketIds
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
            ...ticket,
            timeRemaining: `${ttl} seconds`
        });
    } catch (error) {
        console.error('Error retrieving ticket:', error);
        res.status(500).json({ error: 'Failed to retrieve ticket' });
    }
};