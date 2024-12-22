import client from '../config/redisClient.js';

/**
 * Get trip update by trip_id
 * @param {object} req - The request object containing the trip_id parameter.
 * @param {object} res - The response object for sending back the result.
 */
export const getTripUpdateById = async (req, res) => {
    const { tripId } = req.params;  // Retrieve trip_id from route parameter
    
    try {
        // Query Redis to get the trip update data by trip_id
        const tripUpdateData = await client.hGetAll(`trip_update:${tripId}`);
        
        if (Object.keys(tripUpdateData).length === 0) {
            return res.status(404).json({ error: 'Trip update not found' });
        }

        // Return the trip update data in JSON format
        res.status(200).json(tripUpdateData);
    } catch (error) {
        console.error('Error fetching trip update:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
