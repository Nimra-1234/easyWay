// controllers/gtfsController.js
import Route from '../models/routeModel.js';
import Trip from '../models/tripModel.js';
import Stop from '../models/stopModel.js';
import StopTime from '../models/stopTimeModel.js';

export const getRouteAnalytics = async (req, res) => {
    try {
      const analytics = await Route.aggregate([
        {
          $lookup: {
            from: "trips",
            localField: "route_id",
            foreignField: "route_id",
            as: "route_trips"
          }
        },
        {
          $lookup: {
            from: "stop_times",
            localField: "route_trips.trip_id",
            foreignField: "trip_id",
            as: "trip_stops"
          }
        },
        {
          $lookup: {
            from: "stops",
            localField: "trip_stops.stop_id",
            foreignField: "stop_id",
            as: "route_stops"
          }
        },
        {
          $group: {
            _id: "$route_id",
            route_short_name: { $first: "$route_short_name" },
            route_long_name: { $first: "$route_long_name" },
            total_trips: { $sum: 1 }, // Assuming each document represents a trip
            unique_stops: { $addToSet: "$route_stops.stop_name" }
          }
        },
        {
          $addFields: {
            number_of_stops: { $size: "$unique_stops" }
          }
        },
        {
          $addFields: {
            service_coverage: {
              $cond: [
                { $eq: ["$number_of_stops", 0] }, // Avoid division by zero
                0,
                { $divide: ["$total_trips", "$number_of_stops"] }
              ]
            }
          }
        },
        { $sort: { total_trips: -1 } }
      ]);
  
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
  

export const getBusyStops = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const busyStops = await StopTime.aggregate([
      {
        $group: {
          _id: "$stop_id",
          total_visits: { $sum: 1 },
          peak_hours: {
            $push: {
              $substr: ["$arrival_time", 0, 2]
            }
          }
        }
      },
      {
        $lookup: {
          from: "stops",
          localField: "_id",
          foreignField: "stop_id",
          as: "stop_info"
        }
      },
      { $unwind: "$stop_info" },
      {
        $project: {
          stop_name: "$stop_info.stop_name",
          stop_lat: "$stop_info.stop_lat",
          stop_lon: "$stop_info.stop_lon",
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

// controllers/gtfsController.js

export const getRoutesByTripCount = async (req, res) => {
    const tripCount = parseInt(req.query.tripcount);
    if (isNaN(tripCount)) {
        return res.status(400).json({ success: false, error: 'Invalid trip count specified' });
    }

    try {
        const routes = await Route.aggregate([
            {
                $lookup: {
                    from: "trips",
                    localField: "route_id",
                    foreignField: "route_id",
                    as: "route_trips"
                }
            },
            {
                $group: {
                    _id: "$route_id",
                    route_short_name: { $first: "$route_short_name" },
                    route_long_name: { $first: "$route_long_name" },
                    total_trips: { $sum: 1 }
                }
            },
            {
                $match: {
                    total_trips: tripCount
                }
            },
            // Debugging output to understand what the aggregation pipeline produces
            {
                $project: {
                    debug: "$$ROOT"
                }
            }
        ]);

        console.log(routes); // Check the output in your server logs

        res.json({
            success: true,
            data: routes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


export const calculateAverageTripDuration = async (req, res) => {
    const { routeId } = req.params;

    try {
        const averageDuration = await Trip.aggregate([
            {
                $match: {
                    route_id: routeId
                }
            },
            {
                $lookup: {
                    from: "stoptimes",
                    localField: "trip_id",
                    foreignField: "trip_id",
                    as: "stop_times"
                }
            },
            {
                $unwind: "$stop_times" // Ensure you are manipulating each stop_time individually
            },
            {
                $project: {
                    departure_seconds: {
                        $sum: [
                            { $multiply: [{ $toInt: { $substr: ["$stop_times.departure_time", 0, 2] } }, 3600] }, // hours to seconds
                            { $multiply: [{ $toInt: { $substr: ["$stop_times.departure_time", 3, 2] } }, 60] },   // minutes to seconds
                            { $toInt: { $substr: ["$stop_times.departure_time", 6, 2] } }                      // seconds
                        ]
                    },
                    arrival_seconds: {
                        $sum: [
                            { $multiply: [{ $toInt: { $substr: ["$stop_times.arrival_time", 0, 2] } }, 3600] }, // hours to seconds
                            { $multiply: [{ $toInt: { $substr: ["$stop_times.arrival_time", 3, 2] } }, 60] },   // minutes to seconds
                            { $toInt: { $substr: ["$stop_times.arrival_time", 6, 2] } }                      // seconds
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$route_id",
                    totalDuration: { $sum: { $subtract: ["$departure_seconds", "$arrival_seconds"] } },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    averageDuration: { $divide: ["$totalDuration", "$count"] }
                }
            }
        ]);

        res.json({
            success: true,
            data: averageDuration
        });
    } catch (error) {
        console.error("Error calculating average trip duration:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


export const getStopTimesByTrip = async (req, res) => {
    const { tripId } = req.params; // Extract tripId from the request parameters

    try {
        const stopTimes = await StopTime.find({ trip_id: tripId }).sort({ stop_sequence: 1 });
        res.json({
            success: true,
            data: stopTimes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
