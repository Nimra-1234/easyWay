import redisClient from '../config/redisClient.js';
import User from '../models/userModel.js';

// src/middleware/adminMiddleware.js

// Fixed admin tax codes
const ADMIN_TAX_CODES = [
    'NIMRAADMIN1111',  // Main admin
    'GUESTADMIN1111'    // Secondary admin
];

export const isAdmin = async (req, res, next) => {
    try {
        const taxCode = req.headers['tax-code'];
        
        if (!taxCode) {
            return res.status(401).json({ 
                success: false, 
                error: 'Admin authentication required' 
            });
        }

        // Simple check if tax code is in admin list
        if (!ADMIN_TAX_CODES.includes(taxCode)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Admin access required' 
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