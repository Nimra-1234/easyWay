import client from '../config/redisClient.js';

// Get real-time position of a vehicle
export const getVehiclePosition = async (req, res) => {
  const { vehicleId } = req.params;

  try {
    const vehicleData = await client.hGetAll(`vehicle:${vehicleId}`);

    if (Object.keys(vehicleData).length === 0) {
      return res.status(404).json({ error: 'Vehicle not found or no data available' });
    }

    res.json(vehicleData);
  } catch (error) {
    console.error('Error fetching vehicle position:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
