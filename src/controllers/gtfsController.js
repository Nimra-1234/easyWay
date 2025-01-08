// controllers/gtfsController.js
import Route from '../models/routeModel.js';
import Trip from '../models/tripModel.js';
import Stop from '../models/stopModel.js';
import StopTime from '../models/stopTimeModel.js';
import Calendar from '../models/calendarModel.js';

export const getBusyStops = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const busyStops = await StopTime.aggregate([
      {
        $group: {
          _id: "$stop_info.stop_id",
          stop_name: { $first: "$stop_info.stop_name" },
          stop_lat: { $first: "$stop_info.stop_lat" },
          stop_lon: { $first: "$stop_info.stop_lon" },
          total_visits: { $sum: 1 }
        }
      },
      {
        $project: {
          stop_name: 1,
          stop_lat: 1,
          stop_lon: 1,
          total_visits: 1
        }
      },
      { $sort: { total_visits: -1 } },
      { $limit: limit }
    ]);

    res.json({
      success: true,
      data: busyStops
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
export const calculateTripDuration = async (req, res) => {
  const { tripId } = req.params;

  try {
      const averageDuration = await StopTime.aggregate([
          {
              $match: {
                  trip_id: tripId  // Exact match for trip_id
              }
          },
          {
              $sort: { 
                  stop_sequence: 1 
              }
          },
          {
              $group: {
                  _id: "$trip_id",
                  firstStop: {
                      $first: {
                          time: "$arrival_time",
                          stop_name: "$stop_info.stop_name"
                      }
                  },
                  lastStop: {
                      $last: {
                          time: "$departure_time",
                          stop_name: "$stop_info.stop_name"
                      }
                  }
              }
          },
          {
              $project: {
                  duration: {
                      $let: {
                          vars: {
                              startTime: { $split: ["$firstStop.time", ":"] },
                              endTime: { $split: ["$lastStop.time", ":"] }
                          },
                          in: {
                              $subtract: [
                                  {
                                      $sum: [ 
                                          { $multiply: [{ $toInt: { $arrayElemAt: ["$$endTime", 1] } }, 60] },
                                          { $toInt: { $arrayElemAt: ["$$endTime", 2] } }
                                      ]
                                  },
                                  {
                                      $sum: [
                                          { $multiply: [{ $toInt: { $arrayElemAt: ["$$startTime", 1] } }, 60] },
                                          { $toInt: { $arrayElemAt: ["$$startTime", 2] } }
                                      ]
                                  }
                              ]
                          }
                      }
                  },
                  firstStopName: "$firstStop.stop_name",
                  lastStopName: "$lastStop.stop_name",
                  startTime: "$firstStop.time",
                  endTime: "$lastStop.time"
              }
          },
          {
              $project: {
                  _id: 0,
                  tripId: "$_id",
                  duration: {
                      minutes: { $round: [{ $divide: ["$duration", 60] }, 1] },
                  },
                  route: {
                      firstStop: "$firstStopName",
                      lastStop: "$lastStopName",
                      startTime: "$startTime",
                      endTime: "$endTime"
                  }
              }
          }
      ]);

      if (!averageDuration.length) {
          return res.status(404).json({
              success: false,
              message: `No stops found for trip ${tripId}`
          });
      }

      res.json({
          success: true,
          data: averageDuration[0]
      });
  } catch (error) {
      console.error("Error calculating trip duration:", error);
      res.status(500).json({
          success: false,
          error: error.message
      });
  }
};
export const getRoutesByTripCount = async (req, res) => {
  try {
      const routeAnalysis = await Trip.aggregate([
          // Group by route and count trips
          {
              $group: {
                  _id: "$route_id",
                  trip_count: { $sum: 1 },
                  route_name: { $first: "$route_info.route_short_name" }
              }
          },
          // Format output
          {
              $project: {
                  _id: 0,
                  route_id: "$_id",
                  route_name: 1,
                  trip_count: 1
              }
          },
          // Sort by trip count
          { $sort: { trip_count: -1 } }
      ]);

      if (!routeAnalysis.length) {
          return res.status(404).json({
              success: false,
              message: "No routes found"
          });
      }

      // Get largest and smallest routes
      const result = {
          largest_route: routeAnalysis[0],
          smallest_route: routeAnalysis[routeAnalysis.length - 1]
      };

      res.json({
          success: true,
          data: result
      });

  } catch (error) {
      console.error("Error analyzing routes:", error);
      res.status(500).json({
          success: false,
          error: error.message
      });
  }
};


export const calculateRouteAverageDuration = async (req, res) => {
  const { routeId } = req.params;

  try {
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
                  firstStop: { 
                      arrival_time: { $arrayElemAt: ["$stops.arrival_time", 0] }
                  },
                  lastStop: { 
                      departure_time: { $arrayElemAt: ["$stops.departure_time", -1] }
                  }
              }
          },
          {
              $addFields: {
                  startTimeArray: { $split: ["$firstStop.arrival_time", ":"] },
                  endTimeArray: { $split: ["$lastStop.departure_time", ":"] }
              }
          },
          {
              $addFields: {
                  startMinutes: {
                      $sum: [
                          { $multiply: [{ $toInt: { $arrayElemAt: ["$startTimeArray", 0] } }, 60] },
                          { $toInt: { $arrayElemAt: ["$startTimeArray", 1] } }
                      ]
                  },
                  endMinutes: {
                      $sum: [
                          { $multiply: [{ $toInt: { $arrayElemAt: ["$endTimeArray", 0] } }, 60] },
                          { $toInt: { $arrayElemAt: ["$endTimeArray", 1] } }
                      ]
                  }
              }
          },
          {
              $addFields: {
                  duration: {
                      $cond: {
                          if: { $lt: ["$endMinutes", "$startMinutes"] },
                          then: { 
                              $add: [
                                  { $subtract: [1440, "$startMinutes"] },
                                  "$endMinutes"
                              ]
                          },
                          else: { $subtract: ["$endMinutes", "$startMinutes"] }
                      }
                  }
              }
          },
          {
              $group: {
                  _id: null,
                  averageDuration: { $avg: "$duration" },
                  totalDuration: { $sum: "$duration" },
                  totalTrips: { $sum: 1 }
              }
          },
          {
              $project: {
                  _id: 0,
                  totalTrips: 1,
                  totalDuration: { $round: ["$totalDuration", 1] },
                  averageDuration: { $round: ["$averageDuration", 1] }
              }
          }
      ]);

      if (!routeAnalysis.length) {
          return res.status(404).json({
              success: false,
              message: `No trip data found for route ${routeId}`
          });
      }

      res.json({
          success: true,
          data: {
              routeId,
              ...routeAnalysis[0]
          }
      });

  } catch (error) {
      console.error('Error calculating route average duration:', error);
      res.status(500).json({
          success: false,
          message: "Error calculating route average duration",
          error: error.message
      });
  }
};