// import redisClient from '../config/redisClient.js';
// import { v4 as uuidv4 } from 'uuid';

// const TICKET_EXPIRY_SECONDS = 1 * 60; // 70 minutes in seconds
// const taxCodeRegex = /^[a-zA-Z0-9]{14}$/;

// export const createTicket = async (req, res) => {
//     const { name, taxCode, routeId, tripId } = req.body;
  
//     try {
//         if (!taxCodeRegex.test(taxCode)) {
//             return res.status(400).json({ error: 'Invalid tax code format.' });
//         }
  
//         // Get or create user (permanent storage)
//         let user = await redisClient.hGetAll(`user:${taxCode}`);
  
//         if (Object.keys(user).length === 0) {
//             user = {
//                 name,
//                 taxCode,
//                 createdAt: new Date().toISOString(),
//                 totalTickets: '0'
//             };
//             await redisClient.hSet(`user:${taxCode}`, user);
//         }
  
//         const ticketId = uuidv4();
//         const expirationTime = new Date(Date.now() + TICKET_EXPIRY_SECONDS * 1000);
        
//         const ticket = {
//             ticketId,
//             userId: taxCode,
//             routeId,
//             tripId,
//             status: 'active',
//             createdAt: new Date().toISOString(),
//             expired_at: expirationTime.toISOString()
//         };

//         // Store ticket with TTL
//         await redisClient.hSet(`ticket:${ticketId}`, ticket);
//         await redisClient.expire(`ticket:${ticketId}`, TICKET_EXPIRY_SECONDS);

//         // Increment total tickets count (permanent)
//         await redisClient.hIncrBy(`user:${taxCode}`, 'totalTickets', 1);

//         // Increment active tickets counter (with TTL)
//         const activeCounterKey = `user:${taxCode}:active_count`;
//         await redisClient.incr(activeCounterKey);
//         await redisClient.expire(activeCounterKey, TICKET_EXPIRY_SECONDS);

//         console.log('Ticket stored successfully:', ticket);
  
//         res.status(201).json({ 
//             message: 'Ticket created successfully', 
//             ticket,
//             expiresIn: `${TICKET_EXPIRY_SECONDS} seconds`
//         });
//     } catch (error) {
//         console.error('Error creating ticket:', error);
//         res.status(500).json({ error: `Internal server error: ${error.message}` });
//     }
// };

// export const getTicket = async (req, res) => {
//     const { ticketId } = req.params;

//     try {
//         const ticket = await redisClient.hGetAll(`ticket:${ticketId}`);
        
//         if (Object.keys(ticket).length === 0) {
//             return res.status(404).json({ error: 'Ticket not found or expired' });
//         }

//         const ttl = await redisClient.ttl(`ticket:${ticketId}`);
        
//         res.status(200).json({
//             ...ticket,
//             timeRemaining: ttl > 0 ? `${ttl} seconds` : 'expired'
//         });
//     } catch (error) {
//         console.error('Error retrieving ticket:', error);
//         res.status(500).json({ error: `Internal server error: ${error.message}` });
//     }
// };

// export const getUserStats = async (req, res) => {
//     const { taxCode } = req.params;

//     try {
//         // Get user data
//         const user = await redisClient.hGetAll(`user:${taxCode}`);
//         if (Object.keys(user).length === 0) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Get active tickets count
//         const activeCount = await redisClient.get(`user:${taxCode}:active_count`) || '0';
//         const totalTickets = parseInt(user.totalTickets || '0');

//         res.status(200).json({
//             user: {
//                 taxCode,
//                 name: user.name,
//                 createdAt: user.createdAt
//             },
//             ticketStats: {
//                 totalPurchased: totalTickets,
//                 activeCount: parseInt(activeCount),
//                 expiredCount: totalTickets - parseInt(activeCount)
//             }
//         });
//     } catch (error) {
//         console.error('Error retrieving user stats:', error);
//         res.status(500).json({ error: `Internal server error: ${error.message}` });
//     }
// };

// export const getUserTickets = async (req, res) => {
//     const { taxCode } = req.params;

//     try {
//         // Get user data
//         const user = await redisClient.hGetAll(`user:${taxCode}`);
//         if (Object.keys(user).length === 0) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         // Get counts
//         const activeCount = await redisClient.get(`user:${taxCode}:active_count`) || '0';
//         const totalTickets = parseInt(user.totalTickets || '0');

//         res.status(200).json({
//             taxCode,
//             name: user.name,
//             ticketCounts: {
//                 total: totalTickets,
//                 active: parseInt(activeCount),
//                 expired: totalTickets - parseInt(activeCount)
//             }
//         });
//     } catch (error) {
//         console.error('Error retrieving user tickets:', error);
//         res.status(500).json({ error: `Internal server error: ${error.message}` });
//     }
// };

import redisClient from '../config/redisClient.js';
import { v4 as uuidv4 } from 'uuid';

const TICKET_EXPIRY_SECONDS = 2 * 60; // 70 minutes in seconds
const taxCodeRegex = /^[a-zA-Z0-9]{14}$/;

export const createTicket = async (req, res) => {
    const { name, taxCode, routeId, tripId } = req.body;
  
    try {
        if (!taxCodeRegex.test(taxCode)) {
            return res.status(400).json({ error: 'Invalid tax code format.' });
        }
  
        // Get or create user (permanent storage)
        let user = await redisClient.hGetAll(`user:${taxCode}`);
  
        if (Object.keys(user).length === 0) {
            user = {
                name,
                taxCode,
                createdAt: new Date().toISOString(),
                totalTickets: '0'
            };
            await redisClient.hSet(`user:${taxCode}`, user);
        }
  
        const ticketId = uuidv4();
        const expirationTime = new Date(Date.now() + TICKET_EXPIRY_SECONDS * 1000);
        
        const ticket = {
            ticketId,
            userId: taxCode,
            routeId,
            tripId,
            status: 'active',
            createdAt: new Date().toISOString(),
            expired_at: expirationTime.toISOString()
        };

        // Store ticket with TTL
        await redisClient.hSet(`ticket:${ticketId}`, ticket);
        await redisClient.expire(`ticket:${ticketId}`, TICKET_EXPIRY_SECONDS);

        // Add to user's active tickets set
        await redisClient.sAdd(`user:${taxCode}:active_tickets`, ticketId);
        await redisClient.expire(`user:${taxCode}:active_tickets`, TICKET_EXPIRY_SECONDS);

        // Increment total tickets count (permanent)
        await redisClient.hIncrBy(`user:${taxCode}`, 'totalTickets', 1);

        console.log('Ticket stored successfully:', ticket);
  
        res.status(201).json({ 
            message: 'Ticket created successfully', 
            ticket,
            expiresIn: `${TICKET_EXPIRY_SECONDS} seconds`
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
};

export const getUserTickets = async (req, res) => {
  const { taxCode } = req.params;

  try {
      // Get user data
      const user = await redisClient.hGetAll(`user:${taxCode}`);
      if (Object.keys(user).length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      // Get active ticket IDs
      const activeTicketIds = await redisClient.sMembers(`user:${taxCode}:active_tickets`);
      const totalTickets = parseInt(user.totalTickets || '0');

      // Return only active ticket count and IDs
      res.status(200).json({
          activeTicketCount: activeTicketIds.length,
          activeTicketIds: activeTicketIds,
          totalPurchased: totalTickets
      });

  } catch (error) {
      console.error('Error retrieving user tickets:', error);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

export const getTicket = async (req, res) => {
    const { ticketId } = req.params;

    try {
        const ticket = await redisClient.hGetAll(`ticket:${ticketId}`);
        
        if (Object.keys(ticket).length === 0) {
            return res.status(404).json({ error: 'Ticket not found or expired' });
        }

        const ttl = await redisClient.ttl(`ticket:${ticketId}`);
        
        res.status(200).json({
            ...ticket,
            timeRemaining: ttl > 0 ? `${ttl} seconds` : 'expired'
        });
    } catch (error) {
        console.error('Error retrieving ticket:', error);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
};

