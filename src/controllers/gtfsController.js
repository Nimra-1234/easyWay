// controllers/gtfsController.js
import Route from '../models/routeModel.js';
import Trip from '../models/tripModel.js';
import Stop from '../models/stopModel.js';
import StopTime from '../models/stopTimeModel.js';

export const getBusyStops = async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const busyStops = await Stop.aggregate([
        { $addFields: { total_visits: { $size: "$stop_times" }}},
        { $sort: { total_visits: -1 }},
        { $project: {_id: 0,stop_id: 1,stop_name: 1,stop_lat: 1,stop_lon: 1,total_visits: 1}},
        { $limit: limit}]);
  
      res.json({
        success: true,
        data: busyStops
      });
  
    } catch (error) {
      console.error('Error in getBusyStops:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  export const calculateTripDuration = async (req, res) => {
    const { tripId } = req.params;
    try {
        const tripDuration = await Trip.aggregate([
            { $match: { trip_id: tripId } },
            {
                $project: {
                    _id: 0,
                    tripId: "$trip_id",
                    trip_headsign: 1,
                    duration: {
                        total_minutes: {
                            $subtract: [
                                {
                                    $add: [
                                        { $multiply: [{ $toInt: { $substr: [{ $arrayElemAt: ["$itinerary.arrival_time", -1] }, 0, 2] } }, 60] },
                                        { $toInt: { $substr: [{ $arrayElemAt: ["$itinerary.arrival_time", -1] }, 3, 2] } }
                                    ]
                                },
                                {
                                    $add: [
                                        { $multiply: [{ $toInt: { $substr: [{ $arrayElemAt: ["$itinerary.departure_time", 0] }, 0, 2] } }, 60] },
                                        { $toInt: { $substr: [{ $arrayElemAt: ["$itinerary.departure_time", 0] }, 3, 2] } }
                                    ]
                                }
                            ]
                        }
                    },
                    trip_info: {
                        totalStops: { $size: "$itinerary" },
                        first_stop: { $arrayElemAt: ["$itinerary.stop_name", 0] },
                        last_stop: { $arrayElemAt: ["$itinerary.stop_name", -1] },
                        departure_time: { $arrayElemAt: ["$itinerary.departure_time", 0] },
                        arrival_time: { $arrayElemAt: ["$itinerary.arrival_time", -1] }
                    }
                }
            },
            // Add hours and minutes calculation
            {
                $addFields: {
                    "duration.hours": { $floor: { $divide: ["$duration.total_minutes", 60] } },
                    "duration.minutes": { $mod: ["$duration.total_minutes", 60] }
                }
            }
        ]);

        if (!tripDuration.length) {
            return res.status(404).json({
                success: false,
                message: `No trip found with ID ${tripId}`
            });
        }

        res.json({
            success: true,
            data: tripDuration[0]
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
      const routeAnalysis = await Route.aggregate([
        {$addFields: {trip_count: { $size: "$trips" }}},
        {$project: {_id: 0,route_id: 1,route_name: "$route_short_name",trip_count: 1}},
        { $sort: { trip_count: -1 } }]);
  
      if (!routeAnalysis.length) {
        return res.status(404).json({
          success: false,
          message: "No routes found"
        });
      }
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
        const route = await Route.findOne({ route_id: routeId });
        if (!route) {
            return res.status(404).json({
                success: false,
                message: `No route found with ID ${routeId}`
            });
        }
        const tripIds = route.trips.map(trip => trip.trip_id);

        const tripsWithTimes = await Trip.aggregate([
            { 
                $match: { trip_id: { $in: tripIds } } 
            },
            {
                $addFields: {
                    firstStop: { $arrayElemAt: ["$itinerary", 0] },
                    lastStop: { $arrayElemAt: ["$itinerary", -1] }
                }
            },
            // Convert times to minutes
            {
                $addFields: {
                    startMinutes: {
                        $sum: [
                            { $multiply: [{ $toInt: { $substr: ["$firstStop.departure_time", 0, 2] } }, 60] },
                            { $toInt: { $substr: ["$firstStop.departure_time", 3, 2] } }
                        ]
                    },
                    endMinutes: {
                        $sum: [
                            { $multiply: [{ $toInt: { $substr: ["$lastStop.arrival_time", 0, 2] } }, 60] },
                            { $toInt: { $substr: ["$lastStop.arrival_time", 3, 2] } }
                        ]
                    }
                }
            },
            // Calculate duration with midnight crossing handling
            {
                $addFields: {
                    duration: {
                        $let: {
                            vars: { timeDiff: { $subtract: ["$endMinutes", "$startMinutes"] } },
                            in: {
                                $cond: {
                                    if: { $lt: ["$$timeDiff", 0] },
                                    then: { $add: [1440, "$$timeDiff"] },
                                    else: "$$timeDiff"
                                }
                            }
                        }
                    }
                }
            },
            // Group for statistics
            {
                $group: {
                    _id: null,
                    totalTrips: { $sum: 1 },
                    totalDuration: { $sum: "$duration" },
                    averageDuration: { $avg: "$duration" }
                }
            }
        ]);

        if (!tripsWithTimes.length) {
            return res.status(404).json({
                success: false,
                message: `No trip data found for route ${routeId}`
            });
        }

        const stats = tripsWithTimes[0];
        const response = {
            routeId,
            route_info: {
                short_name: route.route_short_name
            },
            statistics: {
                total_trips: stats.totalTrips,
                total_duration_minutes: Math.floor(stats.totalDuration),
                average_duration_minutes: Math.round(stats.averageDuration)
            }
        };

        res.json({
            success: true,
            data: response
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