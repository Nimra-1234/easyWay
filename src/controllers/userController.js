import bcrypt from 'bcryptjs';
import redisClient from '../config/redisClient.js';  // Redis client import

// Example of user login (without authentication token part)
export const loginUser = async (req, res) => {
  const { taxCode, password } = req.body;

  try {
    // Fetch the user data from Redis using taxCode
    const user = await redisClient.hGetAll(`user:${taxCode}`);

    if (Object.keys(user).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Since JWT token generation is removed, just respond with a success message
    res.status(200).json({
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new user (without generating a token)
// createUser function
export const createUser = async (req, res) => {
  const { name, taxCode, contact, password } = req.body;

  console.log("Received data:", req.body);  // Log incoming data

  try {
    // Check if the user already exists in Redis
    const existingUser = await redisClient.hGetAll(`user:${taxCode}`);
    if (Object.keys(existingUser).length !== 0) {
      return res.status(400).json({ error: 'User with this taxCode already exists.' });
    }

    // Create an object with all the user data
    const userData = {
      name,
      taxCode,
      contact: JSON.stringify(contact), // Stringify contact object if it's complex
      createdAt: new Date().toISOString(),
    };

    console.log("User data to be stored:", userData);  // Log user data

    // Store user data in Redis using hSet with the object
    await redisClient.hSet(`user:${taxCode}`, userData);

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);  // Log the error
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Get user details by taxCode
export const getUser = async (req, res) => {
  const { taxCode } = req.params;

  try {
    // Fetch user details from Redis using taxCode
    const user = await redisClient.hGetAll(`user:${taxCode}`);
    if (Object.keys(user).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);  // Respond with the user's details
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get ticket count for a user by taxCode
export const getTicketCount = async (req, res) => {
  const { taxCode } = req.params;

  try {
    // Fetch all ticket keys where userId matches taxCode
    const allTicketKeys = await redisClient.keys('ticket:*');
    
    // Filter tickets by userId (taxCode)
    const userTickets = await Promise.all(
      allTicketKeys.map(async (ticketKey) => {
        const ticket = await redisClient.hGetAll(ticketKey);
        if (ticket.userId === taxCode) {
          return ticket;  // Return the ticket if it matches the userId
        }
      })
    );

    // Filter out undefined tickets (non-matching tickets)
    const validUserTickets = userTickets.filter(ticket => ticket !== undefined);

    // Return the count of the valid user tickets
    res.status(200).json({ ticketCount: validUserTickets.length });
    
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Update user details
export const updateUser = async (req, res) => {
    const { taxCode } = req.params;
    const { name, contact } = req.body;

    try {
        const user = await redisClient.hGetAll(`user:${taxCode}`);
        if (Object.keys(user).length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user data in Redis
        await redisClient.hSet(`user:${taxCode}`, { name, contact });

        res.status(200).json({ message: 'User details updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete user
export const deleteUser = async (req, res) => {
    const { taxCode } = req.params;

    try {
        const user = await redisClient.hGetAll(`user:${taxCode}`);
        if (Object.keys(user).length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete user from Redis
        await redisClient.del(`user:${taxCode}`);

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

