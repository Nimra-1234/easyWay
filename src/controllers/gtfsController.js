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
// export const calculateTripDuration = async (req, res) => {
//   const { tripId } = req.params;

//   try {
//       const averageDuration = await StopTime.aggregate([
//           {
//               $match: {
//                   trip_id: tripId  // Exact match for trip_id
//               }
//           },
//           {
//               $sort: { 
//                   stop_sequence: 1 
//               }
//           },
//           {
//               $group: {
//                   _id: "$trip_id",
//                   firstStop: {
//                       $first: {
//                           time: "$arrival_time",
//                           stop_name: "$stop_info.stop_name"
//                       }
//                   },
//                   lastStop: {
//                       $last: {
//                           time: "$departure_time",
//                           stop_name: "$stop_info.stop_name"
//                       }
//                   }
//               }
//           },
//           {
//               $project: {
//                   duration: {
//                       $let: {
//                           vars: {
//                               startTime: { $split: ["$firstStop.time", ":"] },
//                               endTime: { $split: ["$lastStop.time", ":"] }
//                           },
//                           in: {
//                               $subtract: [
//                                   {
//                                       $sum: [ 
//                                           { $multiply: [{ $toInt: { $arrayElemAt: ["$$endTime", 1] } }, 60] },
//                                           { $toInt: { $arrayElemAt: ["$$endTime", 2] } }
//                                       ]
//                                   },
//                                   {
//                                       $sum: [
//                                           { $multiply: [{ $toInt: { $arrayElemAt: ["$$startTime", 1] } }, 60] },
//                                           { $toInt: { $arrayElemAt: ["$$startTime", 2] } }
//                                       ]
//                                   }
//                               ]
//                           }
//                       }
//                   },
//                   firstStopName: "$firstStop.stop_name",
//                   lastStopName: "$lastStop.stop_name",
//                   startTime: "$firstStop.time",
//                   endTime: "$lastStop.time"
//               }
//           },
//           {
//               $project: {
//                   _id: 0,
//                   tripId: "$_id",
//                   duration: {
//                       minutes: { $round: [{ $divide: ["$duration", 60] }, 1] },
//                   },
//                   route: {
//                       firstStop: "$firstStopName",
//                       lastStop: "$lastStopName",
//                       startTime: "$startTime",
//                       endTime: "$endTime"
//                   }
//               }
//           }
//       ]);

//       if (!averageDuration.length) {
//           return res.status(404).json({
//               success: false,
//               message: `No stops found for trip ${tripId}`
//           });
//       }

//       res.json({
//           success: true,
//           data: averageDuration[0]
//       });
//   } catch (error) {
//       console.error("Error calculating trip duration:", error);
//       res.status(500).json({
//           success: false,
//           error: error.message
//       });
//   }
// };

export const calculateTripDuration = async (req, res) => {
    const { tripId } = req.params;
  
    try {
      const tripDuration = await Trip.aggregate([
        {$match: {trip_id: tripId}},
        {$unwind: "$stops"},
        {$unwind: "$stops.stop_times"},
        {$sort: {"stops.stop_times.stop_sequence": 1}},
  
        // Group to get first and last stops
        {$group: {
            _id: "$trip_id",
            trip_headsign: { $first: "$trip_headsign" },
            firstStop: {
              $first: {
                name: "$stops.stop_name",
                time: "$stops.stop_times.arrival_time"
              }
            },
            lastStop: {
              $last: {
                name: "$stops.stop_name",
                time: "$stops.stop_times.departure_time"
              }
            }
          }
        },
  
        // Calculate duration
        {
          $project: {
            _id: 0,
            tripId: "$_id",
            trip_headsign: 1,
            duration: {
              $let: {
                vars: {
                  startTime: { $split: ["$firstStop.time", ":"] },
                  endTime: { $split: ["$lastStop.time", ":"] }
                },
                in: {
                  $subtract: [
                    {
                      $add: [
                        { $multiply: [{ $toInt: { $arrayElemAt: ["$$endTime", 0] } }, 3600] },
                        { $multiply: [{ $toInt: { $arrayElemAt: ["$$endTime", 1] } }, 60] },
                        { $toInt: { $arrayElemAt: ["$$endTime", 2] } }
                      ]
                    },
                    {
                      $add: [
                        { $multiply: [{ $toInt: { $arrayElemAt: ["$$startTime", 0] } }, 3600] },
                        { $multiply: [{ $toInt: { $arrayElemAt: ["$$startTime", 1] } }, 60] },
                        { $toInt: { $arrayElemAt: ["$$startTime", 2] } }
                      ]
                    }
                  ]
                }
              }
            },
            route_info: {
              first_stop: "$firstStop.name",
              last_stop: "$lastStop.name",
              departure_time: "$firstStop.time",
              arrival_time: "$lastStop.time"
            }
          }
        },
  
        // Format the final output
        {
          $project: {
            tripId: 1,
            trip_headsign: 1,
            duration: {
              hours: {
                $floor: { $divide: ["$duration", 3600] }
              },
              minutes: {
                $round: [
                  {
                    $divide: [
                      { $mod: ["$duration", 3600] },
                      60
                    ]
                  },
                  1
                ]
              },
              total_minutes: {
                $round: [{ $divide: ["$duration", 60] }, 1]
              }
            },
            route_info: 1
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