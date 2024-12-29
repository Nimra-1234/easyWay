import redisClient from '../config/redisClient.js';  // Redis client import

// Regular expressions for validation
const taxCodeRegex = /^[a-zA-Z0-9]{14}$/;
const emailRegex = /^\S+@\S+\.\S+$/;

// Create or update a user in Redis
export const createUser = async (req, res) => {
  const { name, taxCode, contact } = req.body;

  console.log('Received data:', req.body); // Log incoming data

  try {
    if (!name || !taxCode || !contact || !taxCodeRegex.test(taxCode) || !emailRegex.test(contact)) {
      return res.status(400).json({ error: 'Missing or invalid fields' });
    }

    const existingUser = await redisClient.hGetAll(`user:${taxCode}`);
    if (Object.keys(existingUser).length !== 0) {
      return res.status(400).json({ error: 'User with this tax code already exists.' });
    }

    const emailKey = `email:${contact}`;
    const existingEmail = await redisClient.get(emailKey);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already associated with another user.' });
    }

    const userData = { 
      name, 
      taxCode, 
      contact, 
      createdAt: new Date().toISOString(),
      updatedAt: '0'  // Set updatedAt to 0 initially
    };

    console.log('User data to be stored:', userData); // Log user data

    await redisClient.hSet(`user:${taxCode}`, userData);
    await redisClient.set(emailKey, taxCode); // Link email to taxCode for quick lookup

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error); // Log the error
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};


// Update user details
export const updateUser = async (req, res) => {
  const { taxCode } = req.params;  // Extract taxCode from the URL parameter
  const { name, contact } = req.body;  // Extract name and contact (email) from the request body

  try {
    // Check if the contact (email) is valid
    if (!emailRegex.test(contact)) {
      return res.status(400).json({ error: 'Invalid contact format. Must be a valid email address.' });
    }

    // Fetch the user from Redis using the taxCode
    const user = await redisClient.hGetAll(`user:${taxCode}`);
    if (Object.keys(user).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the user data in Redis
    await redisClient.hSet(`user:${taxCode}`, {
      name,
      contact,
      updatedAt: new Date().toISOString(),  // Update the updatedAt field with the current time
    });

    res.status(200).json({ message: 'User details updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
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

    // Return the count of valid user tickets
    res.status(200).json({ ticketCount: validUserTickets.length });
    
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  const { taxCode } = req.params;

  // Validate the taxCode format (14 digits, alphanumeric)
  const taxCodeRegex = /^[a-zA-Z0-9]{14}$/;

  if (!taxCodeRegex.test(taxCode)) {
    return res.status(400).json({
      error: 'Invalid tax code format. Tax code must be exactly 14 characters (letters and numbers only).'
    });
  }

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
