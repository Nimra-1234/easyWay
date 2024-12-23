import redisClient from '../config/redisClient.js'; // Redis client import


// Regular expressions for validation
const taxCodeRegex = /^[a-zA-Z0-9]{14}$/;
const emailRegex = /^\S+@\S+\.\S+$/;

export const createUser = async (req, res) => {
  const { name, taxCode, contact } = req.body;

  console.log('Received data:', req.body); // Log incoming data

  try {
    // Validate required fields
    if (!name || !taxCode || !contact) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate taxCode format
    if (!taxCodeRegex.test(taxCode)) {
      return res.status(400).json({ error: 'Invalid tax code format. Must be exactly 14 characters (letters and numbers only).' });
    }

    // Validate contact as an email
    if (!emailRegex.test(contact)) {
      return res.status(400).json({ error: 'Invalid contact format. Must be a valid email address.' });
    }

    // Check if the user already exists in Redis for the same taxCode
    const existingUser = await redisClient.hGetAll(`user:${taxCode}`);
    if (Object.keys(existingUser).length !== 0) {
      return res.status(400).json({ error: 'User with this tax code already exists in Redis.' });
    }

    // Check if email already exists for the same taxCode in Redis
    const allUserKeys = await redisClient.keys('user:*');
    const existingEmailUser = await Promise.all(
      allUserKeys.map(async (userKey) => {
        const user = await redisClient.hGetAll(userKey);
        if (user.contact === contact) {
          return user; // Return user if the email matches
        }
      })
    );

    if (existingEmailUser.filter(Boolean).length > 0) {
      return res.status(400).json({ error: 'Email already associated with another user in Redis.' });
    }

    // Create an object with all the user data
    const userData = {
      name,
      taxCode,
      contact,
      createdAt: new Date().toISOString(),
    };

    console.log('User data to be stored in Redis:', userData); // Log user data

    // Store user data in Redis using hSet with the object
    await redisClient.hSet(`user:${taxCode}`, userData);

    res.status(201).json({ message: 'User created successfully and stored in Redis' });
  } catch (error) {
    console.error('Error creating user:', error); // Log the error
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

// Get user details by taxCode from Redis
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

// Update user details in Redis
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

// Delete user from Redis
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

