import redisClient from '../config/redisClient.js'; // Redis client import
import { v4 as uuidv4 } from 'uuid'; // To generate unique ticket IDs

// Define ticket expiry time in seconds (70 minutes = 4200 seconds)
const TICKET_EXPIRY_TIME = 4200;

// Regular expression to validate taxCode
const taxCodeRegex = /^[a-zA-Z0-9]{14}$/;

export const createTicket = async (req, res) => {
    const { name, taxCode, routeId, tripId, contact } = req.body;

    try {
        // Validate taxCode format
        if (!taxCodeRegex.test(taxCode)) {
            return res.status(400).json({ error: 'Invalid tax code format. Must be exactly 14 characters (letters and numbers only).' });
        }

        // Check if the user exists
        let user = await redisClient.hGet(`user:${taxCode}`, 'data');

        if (!user) {
            // If the user does not exist, create the user
            user = {
                name,
                taxCode,
                contact, // Assuming contact is a string or serializable
                createdAt: new Date().toISOString(),
            };

            // Store the user in Redis as a JSON string
            await redisClient.hSet(`user:${taxCode}`, 'data', JSON.stringify(user));
            console.log(`New user created with taxCode: ${taxCode}`);
        } else {
            // Parse user if it exists
            user = JSON.parse(user);
        }

        // Generate a unique ticket ID
        const ticketId = uuidv4();

        // Calculate expiry time
        const expiryTime = new Date(Date.now() + TICKET_EXPIRY_TIME * 1000).toISOString();

        // Create the ticket object
        const ticket = {
            ticketId,
            userId: taxCode, // The user's taxCode is the user ID
            routeId,
            tripId,
            status: 'active', // Default status when ticket is created
            createdAt: new Date().toISOString(),
            expiryTime, // Store the exact expiry time
        };

        // Store the ticket in Redis as a JSON string
        await redisClient.hSet(`ticket:${ticketId}`, 'data', JSON.stringify(ticket));

        // Set the expiry time for the ticket (70 minutes)
        await redisClient.expire(`ticket:${ticketId}`, TICKET_EXPIRY_TIME);

        // Respond with success message and ticket details
        res.status(201).json({
            message: 'Ticket created successfully',
            ticket,
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getTicket = async (req, res) => {
    const { ticketId } = req.params;

    try {
        // Fetch ticket details from Redis
        const ticketData = await redisClient.hGet(`ticket:${ticketId}`, 'data');

        if (!ticketData) {
            return res.status(404).json({ error: 'Ticket not found or expired' });
        }

        // Parse the ticket data
        const ticket = JSON.parse(ticketData);

        // Get the remaining time-to-live (TTL) in seconds
        const ttl = await redisClient.ttl(`ticket:${ticketId}`);

        // If TTL is greater than 0, calculate the time left in minutes and seconds
        const timeLeft = ttl > 0 ? `${Math.floor(ttl / 60)}m ${ttl % 60}s` : 'Expired';

        // Add timeLeft to the ticket details
        res.status(200).json({
            ...ticket,
            timeLeft,
        });
    } catch (error) {
        console.error('Error retrieving ticket:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
