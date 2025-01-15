// controllers/gtfsController.js
import Route from '../models/routeModel.js';
import Trip from '../models/tripModel.js';
import Stop from '../models/stopModel.js';
import StopTime from '../models/stopTimeModel.js';

export const getBusyStops = async (req, res) => {
try {
    const limit = parseInt(req.query.limit) || 100;

    const busyStops = await Trip.aggregate([
      {$unwind: "$stops"},
      {$unwind: "$stops.stop_times"},
      {$group: {_id: "$stops.stop_id", stop_name: { $first: "$stops.stop_name" },
       stop_lat: { $first: "$stops.stop_lat" },stop_lon: { $first: "$stops.stop_lon" }, 
       total_visits: { $sum: 1 }}},
      {$sort: {  total_visits: -1 }},
      {$project: {stop_id: "$_id", stop_name: 1, stop_lat: 1, stop_lon: 1, total_visits: 1, _id: 0}},
      {$limit: limit}]);

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
                $addFields: {
                    firstStop: { $arrayElemAt: ["$stops", 0] },
                    lastStop: { $arrayElemAt: ["$stops", -1] }
                }
            },
            {
                $addFields: {
                    startTime: { $arrayElemAt: ["$firstStop.stop_times.departure_time", 0] },
                    endTime: { $arrayElemAt: ["$lastStop.stop_times.arrival_time", 0] }}
            },
            {
                $addFields: {
                    timeMinutes: {
                        start: {
                            $add: [
                                { $multiply: [{ $toInt: { $substr: ["$startTime", 0, 2] } }, 60] },
                                { $toInt: { $substr: ["$startTime", 3, 2] } }
                            ]
                        },
                        end: {
                            $add: [
                                { $multiply: [{ $toInt: { $substr: ["$endTime", 0, 2] } }, 60] },
                                { $toInt: { $substr: ["$endTime", 3, 2] } }]}}}},
            {
                $project: {
                    _id: 0,
                    tripId: "$trip_id",
                    trip_headsign: 1,
                    duration: {
                        hours: { 
                            $floor: { 
                                $divide: [
                                    { $subtract: ["$timeMinutes.end", "$timeMinutes.start"] }, 60]}},
                        minutes: { 
                            $mod: [
                                { $subtract: ["$timeMinutes.end", "$timeMinutes.start"] }, 60]}},
                    trip_info: {
                        totalStops: { $size: "$stops" },
                        first_stop: "$firstStop.stop_name",
                        last_stop: "$lastStop.stop_name"}}}]);
    
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
        // Document Linking: First get route document
        const route = await Route.findOne({ route_id: routeId });
        if (!route) {
            return res.status(404).json({
                success: false,
                message: `No route found with ID ${routeId}`
            });
        }
        const tripIds = route.trips.map(trip => trip.trip_id);

        const tripsWithTimes = await Trip.aggregate([
            { $match: {trip_id: { $in: tripIds }} },
            {
                $addFields: {
                    firstStop: { $arrayElemAt: ["$stops", 0] },
                    lastStop: { $arrayElemAt: ["$stops", -1] }
                }
            },
            {
                $addFields: {
                    startTime: { $arrayElemAt: ["$firstStop.stop_times.departure_time", 0] },
                    endTime: { $arrayElemAt: ["$lastStop.stop_times.arrival_time", 0] }}
            },
            {
                $addFields: {
                    startMinutes: {
                        $sum: [
                            { $multiply: [{ $toInt: { $substr: ["$startTime", 0, 2] } }, 60] },
                            { $toInt: { $substr: ["$startTime", 3, 2] } }]},
                    endMinutes: {
                        $sum: [
                            { $multiply: [{ $toInt: { $substr: ["$endTime", 0, 2] } }, 60] },
                            { $toInt: { $substr: ["$endTime", 3, 2] } }]}}
            },
            {
                $addFields: {
                    duration: {
                        $let: {
                            vars: {timeDiff: { $subtract: ["$endMinutes", "$startMinutes"] }},
                            in: {
                                $cond: {
                                    if: { $lt: ["$$timeDiff", 0] },
                                    then: { $add: [1440, "$$timeDiff"] },
                                    else: "$$timeDiff"}}}}}
            },
            {
                $group: {_id: null,
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