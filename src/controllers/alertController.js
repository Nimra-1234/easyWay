import client from '../config/redisClient.js'; // Import the Redis client

// Get alert data by alertId
export const getAlertById = async (req, res) => {
  const { alertId } = req.params;

  try {
    const alertData = await client.hGetAll(`alert:${alertId}`);

    if (!alertData || Object.keys(alertData).length === 0) {
      return res.status(404).json({ error: 'Alert data not found' });
    }

    res.json(alertData);
  } catch (error) {
    console.error('Error fetching alert data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
