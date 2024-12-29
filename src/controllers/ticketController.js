import redisClient from '../config/redisClient.js';  // Redis client import
import { v4 as uuidv4 } from 'uuid'; // To generate unique ticket IDs
const taxCodeRegex = /^[a-zA-Z0-9]{14}$/;


export const createTicket = async (req, res) => {
    const { name, taxCode, routeId, tripId } = req.body;
  
    console.log('Received data:', req.body);  // Log the incoming data for debugging
  
    try {
      if (!taxCodeRegex.test(taxCode)) {
        return res.status(400).json({ error: 'Invalid tax code format.' });
      }
  
      let user = await redisClient.hGetAll(`user:${taxCode}`);
      console.log(`User found in Redis:`, user);  // Log user data for debugging
  
      if (Object.keys(user).length === 0) {
        // If the user does not exist, create the user
        user = {
            name,
            taxCode,
            createdAt: new Date().toISOString(),
        };
        
        // Store the user in Redis
        await redisClient.hSet(`user:${taxCode}`, user);
        console.log(`New user created with taxCode: ${taxCode}`);
      }
  
      const ticketId = uuidv4();
      console.log(`Generated ticket ID: ${ticketId}`);  // Log ticket ID for debugging
  
      // Calculate expiration time (70 minutes from now)
      const expirationTime = new Date(Date.now() + 70 * 60 * 1000);
      const expirationTimeFormatted = expirationTime.toISOString();
  
      const ticket = {
        ticketId, 
        userId: taxCode, 
        routeId, 
        tripId, 
        status: 'active', 
        createdAt: new Date().toISOString(),
        expired_at: expirationTimeFormatted
      };
  
      await redisClient.hSet(`ticket:${ticketId}`, ticket);
      await redisClient.sAdd(`user:${taxCode}:tickets`, ticketId); // Link ticket to user
  
      console.log('Ticket stored successfully in Redis', ticket);  // Log success message
  
      res.status(201).json({ message: 'Ticket created successfully', ticket });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
};


// Retrieve all tickets for a specific user
export const getUserTickets = async (req, res) => {
  const { taxCode } = req.params;

  try {
    const ticketIds = await redisClient.sMembers(`user:${taxCode}:tickets`);
    const tickets = await Promise.all(
      ticketIds.map(ticketId => redisClient.hGetAll(`ticket:${ticketId}`))
    );

    if (!tickets.length) {
      return res.status(404).json({ error: 'No tickets found for this user' });
    }

    res.status(200).json(tickets);
  } catch (error) {
    console.error('Error retrieving tickets:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

// Get ticket details by ticket ID
export const getTicket = async (req, res) => {
    const { ticketId } = req.params;

    try {
        const ticket = await redisClient.hGetAll(`ticket:${ticketId}`);
        
        if (Object.keys(ticket).length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.status(200).json(ticket);
    } catch (error) {
        console.error('Error retrieving ticket:', error);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
};

export const getExpiredTickets = async (req, res) => {
    try {
      const allTicketKeys = await redisClient.keys('ticket:*');
      const expiredTickets = await Promise.all(
        allTicketKeys.map(async (ticketKey) => {
          const ticket = await redisClient.hGetAll(ticketKey);
          const expiredAt = new Date(ticket.expired_at || 0);
          const currentTime = new Date();
  
          if (expiredAt < currentTime) {
            return ticket;
          }
        })
      );

      const validExpiredTickets = expiredTickets.filter(ticket => ticket);

      if (validExpiredTickets.length === 0) {
        return res.status(404).json({ error: 'No expired tickets found' });
      }
  
      res.status(200).json(validExpiredTickets);
    } catch (error) {
      console.error('Error retrieving expired tickets:', error);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
};



  

// export const getExpiredTickets = async (req, res) => {
//     try {
//       // Get all ticket keys
//       const allTicketKeys = await redisClient.keys('ticket:*');
      
//       // Fetch the ticket data for each ticketId
//       const expiredTickets = await Promise.all(
//         allTicketKeys.map(async (ticketKey) => {
//           const ticket = await redisClient.hGetAll(ticketKey);
  
//           // Check if ticket has expired
//           const expiredAt = new Date(ticket.expired_at);
//           const currentTime = new Date();
  
//           if (expiredAt < currentTime) {
//             return ticket; // Return the expired ticket
//           }
//         })
//       );
  
//       // Filter out undefined tickets (non-expired)
//       const validExpiredTickets = expiredTickets.filter(ticket => ticket !== undefined);
  
//       if (validExpiredTickets.length === 0) {
//         return res.status(404).json({ error: 'No expired tickets found' });
//       }
  
//       // Return the expired tickets
//       res.status(200).json(validExpiredTickets);
  
//     } catch (error) {
//       console.error('Error retrieving expired tickets:', error);
//       res.status(500).json({ error: `Internal server error: ${error.message}` });
//     }
//   };
