import client from '../config/redisClient.js';

export const getAllTrips = async (req, res) => {
  const keys = await client.keys('trip:*');
  const routes = await Promise.all(keys.map(key => client.hGetAll(key)));
  res.json(routes);
};

export const getTripById = async (req, res) => {
  const route = await client.hGetAll(`trip:${req.params.id}`);
  res.json(route);
};


