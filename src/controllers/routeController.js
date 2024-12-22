import client from '../config/redisClient.js';

export const getAllRoutes = async (req, res) => {
  const keys = await client.keys('route:*');
  const routes = await Promise.all(keys.map(key => client.hGetAll(key)));
  res.json(routes);
};

export const getRouteById = async (req, res) => {
  const route = await client.hGetAll(`route:${req.params.id}`);
  res.json(route);
};

