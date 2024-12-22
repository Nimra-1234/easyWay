import client from '../config/redisClient.js';

export const getAllStopTimes = async (req, res) => {
  const keys = await client.keys('stop_time:*');
  const stop_time= await Promise.all(keys.map(key => client.hGetAll(key)));
  res.json(stop_time);
};
