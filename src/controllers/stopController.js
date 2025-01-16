import mongoose from 'mongoose';
import Trip from '../models/tripModel.js';

export const getAllStops = async (req, res) => {
    try {
        const stops = await Trip.aggregate([
            // Unwind the stops array
            { $unwind: "$stops" },
            
            // Group by stop details to get unique stops
            {
                $group: {
                    _id: "$stops.stop_id",
                    stop_name: { $first: "$stops.stop_name" },
                    stop_lat: { $first: "$stops.stop_lat" },
                    stop_lon: { $first: "$stops.stop_lon" },
                    location_type: { $first: "$stops.location_type" },
                    wheelchair_boarding: { $first: "$stops.wheelchair_boarding" }
                }
            },
            
            // Format the output
            {
                $project: {
                    _id: 0,
                    stop_id: "$_id",
                    stop_name: 1,
                    stop_lat: 1,
                    stop_lon: 1,
                    location_type: 1,
                    wheelchair_boarding: 1
                }
            }
        ]).limit(1000);

        res.json({
            success: true,
            count: stops.length,
            data: stops
        });

    } catch (error) {
        console.error("Error fetching stops:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching stops",
            error: error.message
        });
    }
};

export const getStopById = async (req, res) => {
    try {
        const { id: stopId } = req.params;

        const [stop] = await Trip.aggregate([
            // Unwind the stops array
            { $unwind: "$stops" },
            
            // Match the specific stop
            {
                $match: {
                    "stops.stop_id": stopId
                }
            },
            
            // Group to get stop details and its stop times
            {
                $group: {
                    _id: "$stops.stop_id",
                    stop_name: { $first: "$stops.stop_name" },
                    stop_lat: { $first: "$stops.stop_lat" },
                    stop_lon: { $first: "$stops.stop_lon" },
                    location_type: { $first: "$stops.location_type" },
                    wheelchair_boarding: { $first: "$stops.wheelchair_boarding" },
                    stop_times: { $push: "$stops.stop_times" }
                }
            },
            
            // Format the output
            {
                $project: {
                    _id: 0,
                    stop_id: "$_id",
                    stop_name: 1,
                    stop_lat: 1,
                    stop_lon: 1,
                    location_type: 1,
                    wheelchair_boarding: 1,
                    stop_times: { $arrayElemAt: ["$stop_times", 0] }
                }
            }
        ]);

        if (!stop) {
            return res.status(404).json({
                success: false,
                message: `Stop with ID ${stopId} not found`
            });
        }

        res.json({
            success: true,
            data: stop
        });

    } catch (error) {
        console.error("Error fetching stop:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching stop",
            error: error.message
        });
    }
};

export const updateStopName = async (req, res) => {
    try {
        const { stop_id, new_name } = req.body;

        if (!stop_id || !new_name) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: stop_id and new_name"
            });
        }

        const result = await Trip.updateMany(
            { "stops.stop_id": stop_id },
            { $set: { "stops.$.stop_name": new_name } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: `Stop with ID ${stop_id} not found`
            });
        }

        res.json({
            success: true,
            message: `Stop name updated successfully`,
            data: {
                stop_id,
                new_name,
                trips_updated: result.modifiedCount
            }
        });

    } catch (error) {
        console.error("Error updating stop:", error);
        res.status(500).json({
            success: false,
            message: "Error updating stop",
            error: error.message
        });
    }
};

export const searchStops = async (req, res) => {
  try {
      const { query } = req.query;

      if (!query || query.trim().length === 0) {
          return res.status(400).json({
              success: false,
              message: "Search query is required"
          });
      }

      const pipeline = [
          // Unwind stops array
          { 
              $unwind: "$stops" 
          },
          // Match stops by name
          {
              $match: {
                  "stops.stop_name": {
                      $regex: query,
                      $options: 'i'
                  }
              }
          },
          // Group by stop_id to get unique stops
          {
              $group: {
                  _id: "$stops.stop_id",
                  stop_name: { $first: "$stops.stop_name" },
                  stop_lat: { $first: "$stops.stop_lat" },
                  stop_lon: { $first: "$stops.stop_lon" },
                  trips_count: { $sum: 1 }
              }
          },
          // Format output
          {
              $project: {
                  _id: 0,
                  stop_id: "$_id",
                  stop_name: 1,
                  location: {
                      lat: "$stop_lat",
                      lon: "$stop_lon"
                  },
                  trips_count: 1
              }
          },
          // Sort results
          { 
              $sort: { 
                  stop_name: 1 
              } 
          },
          // Limit results
          { 
              $limit: 10 
          }
      ];

      const stops = await Trip.aggregate(pipeline);

      res.json({
          success: true,
          count: stops.length,
          data: stops
      });

  } catch (error) {
      console.error("Error searching stops:", error);
      res.status(500).json({
          success: false,
          message: "Error searching stops",
          error: error.message
      });
  }
};

// Auto-complete function for stop names
export const getStopSuggestions = async (req, res) => {
    try {
        const { term } = req.query;

        if (!term) {
            return res.status(400).json({
                success: false,
                message: "Search term is required"
            });
        }

        const suggestions = await Trip.aggregate([
            { $unwind: "$stops" },
            {
                $match: {
                    "stops.stop_name": {
                        $regex: `^${term}`,  // Starts with the search term
                        $options: 'i'
                    }
                }
            },
            {
                $group: {
                    _id: "$stops.stop_id",
                    stop_name: { $first: "$stops.stop_name" }
                }
            },
            {
                $project: {
                    _id: 0,
                    stop_id: "$_id",
                    name: "$stop_name"
                }
            },
            { $sort: { name: 1 } },
            { $limit: 5 }
        ]);

        res.json({
            success: true,
            data: suggestions
        });

    } catch (error) {
        console.error("Error getting stop suggestions:", error);
        res.status(500).json({
            success: false,
            message: "Error getting stop suggestions",
            error: error.message
        });
    }
};