import redisClient from '../config/redisClient.js';  // Redis client import
import { v4 as uuidv4 } from 'uuid'; // To generate unique ticket IDs

// Create a new ticket
export const createTicket = async (req, res) => {
    const { name, taxCode, routeId, tripId } = req.body;
  
    try {
        console.log('Received data:', req.body);  // Log the incoming data for debugging

        // Validate taxCode format (must be 14 digits alphanumeric)
        const taxCodeRegex = /^[a-zA-Z0-9]{14}$/;
        if (!taxCodeRegex.test(taxCode)) {
            return res.status(400).json({ error: 'Invalid tax code format. It must be exactly 14 characters (letters and numbers only).' });
        }

        // Check if the user exists in Redis using taxCode
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

        // Generate a unique ticket ID using UUID
        const ticketId = uuidv4();
        console.log(`Generated ticket ID: ${ticketId}`);  // Log ticket ID for debugging
        
        // Calculate expiration time (70 minutes from now)
        const expirationTime = new Date(Date.now() + 70 * 60 * 1000);  // 70 minutes in the future
        const expirationTimeFormatted = expirationTime.toISOString();  // Format as ISO string
        
        // Create the ticket object
        const ticket = {
            ticketId,
            userId: taxCode,  // The user's taxCode is the user ID
            routeId,
            tripId,
            status: 'active',  // Default status when ticket is created
            expired_at: expirationTimeFormatted,  // Expiration time
            createdOn: new Date().toISOString(),  // Store created time as 'createdOn'
        };

        console.log('Ticket data to be stored:', ticket);  // Log ticket data before storing
        
        // Store the ticket in Redis
        await redisClient.hSet(`ticket:${ticketId}`, ticket);
        console.log('Ticket stored successfully in Redis');  // Log success message

        // Set the expiration time of 70 minutes (in seconds) for the ticket
        await redisClient.expire(`ticket:${ticketId}`, 70 * 60);
        console.log('Expiration time set to 70 minutes for ticket:', ticketId);

        // Respond with success message and ticket details
        res.status(201).json({
            message: 'Ticket created successfully',
            ticket: {
                ticketId,
                userId: taxCode,
                routeId,
                tripId,
                status: 'active',
                createdOn: ticket.createdOn,
                expired_at: ticket.expired_at,  // Return expiration time
            },
        });
    } catch (error) {
        console.error('Error creating ticket:', error);  // Log the error for debugging
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
};

// Get ticket details by ticket ID
export const getTicket = async (req, res) => {
    const { ticketId } = req.params;

    try {
        console.log(`Fetching ticket data for ticketId: ${ticketId}`);  // Log the ticket ID being fetched
        
        // Fetch ticket details from Redis
        const ticket = await redisClient.hGetAll(`ticket:${ticketId}`);
        console.log('Ticket data retrieved from Redis:', ticket);  // Log ticket data for debugging
        
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
      // Get all ticket keys
      const allTicketKeys = await redisClient.keys('ticket:*');
      
      // Fetch the ticket data for each ticketId
      const expiredTickets = await Promise.all(
        allTicketKeys.map(async (ticketKey) => {
          const ticket = await redisClient.hGetAll(ticketKey);
  
          // Check if ticket has expired
          const expiredAt = new Date(ticket.expired_at);
          const currentTime = new Date();
  
          if (expiredAt < currentTime) {
            return ticket; // Return the expired ticket
          }
        })
      );
  
      // Filter out undefined tickets (non-expired)
      const validExpiredTickets = expiredTickets.filter(ticket => ticket !== undefined);
  
      if (validExpiredTickets.length === 0) {
        return res.status(404).json({ error: 'No expired tickets found' });
      }
  
      // Return the expired tickets
      res.status(200).json(validExpiredTickets);
  
    } catch (error) {
      console.error('Error retrieving expired tickets:', error);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
  };