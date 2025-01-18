// src/middleware/adminMiddleware.js
import redisClient from '../config/redisClient.js';
import User from '../models/userModel.js';

// Secure admin codes (should be stored in environment variables in production)
const ADMIN_CODES = {
    MAIN_ADMIN: 'ADM#NIM$2024#SK',    // Main admin - complex code with special characters
    GUEST_ADMIN: 'ADM#GST$2024#SK'     // Secondary admin
};

export const isAdmin = async (req, res, next) => {
    try {
        const adminCode = req.headers['admin-code'];
        
        if (!adminCode) {
            return res.status(401).json({ 
                success: false, 
                error: 'Admin authentication required' 
            });
        }

        // Check if provided code matches any admin code
        if (!Object.values(ADMIN_CODES).includes(adminCode)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Invalid admin credentials' 
            });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};