import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET_KEY; // Use your secret key from the .env file

// Generate a JWT token
export const generateToken = (taxCode) => {
  return jwt.sign({ taxCode }, secretKey, { expiresIn: '0.5h' }); // Expires in 1 hour
};

// Verify a JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, secretKey);
  } catch (error) {
    return null;
  }
};
