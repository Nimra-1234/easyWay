// import client from '../config/redisClient.js';

// export const getAllTrips = async (req, res) => {
//   const keys = await client.keys('trip:*');
//   const routes = await Promise.all(keys.map(key => client.hGetAll(key)));
//   res.json(routes);
// };

// export const getTripById = async (req, res) => {
//   const route = await client.hGetAll(`trip:${req.params.id}`);
//   res.json(route);
// };

import mongoose from 'mongoose';
import Trip from '../models/tripModel.js'; //Assuming a Trip model is defined in this path

export const getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find().limit(1000); // Fetch all trips from the MongoDb Collection
    res.json({
      success: true,
      data: trips
    });
  } catch (error) {
    console.error("Error fetching all trips:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getTripById = async (req, res) => {
  try {
    const tripId = req.params.id;
    const trip = await Trip.findOne({ trip_id: tripId }); // Assuming route_id is the field name

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found"
      });
    }

    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    console.error("Error fetching Trip by ID:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
