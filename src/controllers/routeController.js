import mongoose from 'mongoose';
import Route from '../models/routeModel.js'; //Assuming a Route model is defined in this path

export const getAllRoutes = async (req, res) => {
  try {
    const routes = await Route.find(); // Fetch all routes from the MongoDB collection
    res.json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error("Error fetching all routes:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getRouteById = async (req, res) => {
  try {
    const routeId = req.params.id;
    const route = await Route.findOne({ route_id: routeId }); // Assuming route_id is the field name

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found"
      });
    }

    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    console.error("Error fetching route by ID:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
export const calculateRouteAverageDuration = async (req, res) => {
  const { routeId } = req.params;
  
  console.log('Request received for routeId:', routeId);

  try {
      const debugTrip = await Trip.findOne({ route_id: routeId });
      console.log('Debug Trip search result:', debugTrip);

      if (!debugTrip) {
          console.log(`No route found for ID: ${routeId}`);
          return res.status(404).json({
              success: false,
              message: `Route ${routeId} not found`
          });
      }

      const tripCount = await Trip.countDocuments();
      const routeCount = await Trip.distinct('route_id').length;
      console.log(`Total trips: ${tripCount}, Total routes: ${routeCount}`);

      const routeAnalysis = await Trip.aggregate([
          {
              $match: { 
                  route_id: routeId 
              }
          },
          {
              $lookup: {
                  from: "stoptimes",
                  let: { tripId: "$trip_id" },
                  pipeline: [
                      { 
                          $match: { 
                              $expr: { $eq: ["$trip_id", "$$tripId"] }
                          }
                      },
                      { $sort: { stop_sequence: 1 } }
                  ],
                  as: "stops"
              }
          },
          {
              $match: {
                  "stops": { $ne: [] }
              }
          },
          {
              $project: {
                  trip_id: 1,
                  trip_headsign: 1,
                  direction_id: 1,
                  firstStop: { $arrayElemAt: ["$stops", 0] },
                  lastStop: { $arrayElemAt: ["$stops", -1] },
                  totalStops: { $size: "$stops" }
              }
          },
          {
              $project: {
                  trip_id: 1,
                  trip_headsign: 1,
                  direction_id: 1,
                  totalStops: 1,
                  firstStop: {
                      time: "$firstStop.arrival_time",
                      name: "$firstStop.stop_info.stop_name"
                  },
                  lastStop: {
                      time: "$lastStop.departure_time",
                      name: "$lastStop.stop_info.stop_name"
                  },
                  duration: {
                      $let: {
                          vars: {
                              startTime: { $split: ["$firstStop.arrival_time", ":"] },
                              endTime: { $split: ["$lastStop.departure_time", ":"] },
                              startMinutes: {
                                  $sum: [
                                      { $multiply: [{ $toInt: { $arrayElemAt: ["$$startTime", 0] } }, 60] },
                                      { $toInt: { $arrayElemAt: ["$$startTime", 1] } }
                                  ]
                              },
                              endMinutes: {
                                  $sum: [
                                      { $multiply: [{ $toInt: { $arrayElemAt: ["$$endTime", 0] } }, 60] },
                                      { $toInt: { $arrayElemAt: ["$$endTime", 1] } }
                                  ]
                              }
                          },
                          in: {
                              $cond: {
                                  if: { $lt: ["$$endMinutes", "$$startMinutes"] },
                                  then: { 
                                      $add: [
                                          { $subtract: [1440, "$$startMinutes"] },
                                          "$$endMinutes"
                                      ]
                                  },
                                  else: { $subtract: ["$$endMinutes", "$$startMinutes"] }
                              }
                          }
                      }
                  }
              }
          },
          {
              $group: {
                  _id: {
                      direction_id: "$direction_id",
                      headsign: "$trip_headsign"
                  },
                  averageDuration: { $avg: "$duration" },
                  minDuration: { $min: "$duration" },
                  maxDuration: { $max: "$duration" },
                  totalTrips: { $sum: 1 },
                  trips: {
                      $push: {
                          tripId: "$trip_id",
                          duration: { $round: ["$duration", 1] },
                          totalStops: "$totalStops",
                          firstStop: "$firstStop.name",
                          lastStop: "$lastStop.name",
                          startTime: "$firstStop.time",
                          endTime: "$lastStop.time"
                      }
                  }
              }
          },
          {
              $project: {
                  _id: 0,
                  direction: "$_id.direction_id",
                  headsign: "$_id.headsign",
                  statistics: {
                      averageDuration: { $round: ["$averageDuration", 1] },
                      minDuration: { $round: ["$minDuration", 1] },
                      maxDuration: { $round: ["$maxDuration", 1] },
                      totalTrips: "$totalTrips"
                  },
                  trips: 1
              }
          },
          {
              $sort: {
                  direction: 1
              }
          }
      ]);

      if (!routeAnalysis.length) {
          return res.status(404).json({
              success: false,
              message: `No trip data found for route ${routeId}`
          });
      }

      const response = {
          success: true,
          data: {
              routeId,
              routeInfo: debugTrip.route_info,
              directions: routeAnalysis
          }
      };

      return res.json(response);

  } catch (error) {
      console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
      });
      
      return res.status(500).json({
          success: false,
          message: "Error calculating route average duration",
          error: error.message
      });
  }
};