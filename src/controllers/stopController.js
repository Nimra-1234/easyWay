import mongoose from 'mongoose';
import Stop from '../models/stopModel.js'; //Assuming a Stop Model is defined in this path

export const getAllStops = async (req, res) => {
  try {
    const stops = await Stop.find().limit(1000); // Fetch all stops from the MongoDB collection
    res.json({
      success: true,
      data: stops
    });
  } catch (error) {
    console.error("Error fetching all stops:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getStopById = async (req, res) => {
  try {
    const stopId = req.params.id;
    const stop = await Stop.findOne({ stop_id: stopId }); // Assuming route_id is the field name

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: "Stop not found"
      });
    }

    res.json({
      success: true,
      data: stop
    });
  } catch (error) {
    console.error("Error fetching stop by ID:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};








// Get stop times for a specific trip
// export const getStopTimesByTripId = async (req, res) => {
//   const { tripId } = req.params;
  
//   try {
//     // Get all stop_times for this trip
//     const stopTimeKeys = await client.keys(`stop_time:${tripId}_*`);
//     const stopTimes = await Promise.all(stopTimeKeys.map(key => client.hGetAll(key)));
    
//     // Get trip details
//     const trip = await client.hGetAll(`trip:${tripId}`);
    
//     if (!trip || Object.keys(trip).length === 0) {
//       return res.status(404).json({ error: 'Trip not found' });
//     }
    
//     // Get route details
//     const route = await client.hGetAll(`route:${trip.route_id}`);
    
//     // Get stop details for each stop time
//     const stopDetails = await Promise.all(
//       stopTimes.map(async (stopTime) => {
//         const stop = await client.hGetAll(`stop:${stopTime.stop_id}`);
//         return {
//           ...stopTime,
//           stop_name: stop.stop_name,
//           stop_lat: stop.stop_lat,
//           stop_lon: stop.stop_lon
//         };
//       })
//     );
    
//     // Sort by stop sequence
//     const sortedStopDetails = stopDetails.sort(
//       (a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence)
//     );
    
//     res.json({
//       trip_id: tripId,
//       route_id: trip.route_id,
//       route_name: route.route_long_name || route.route_short_name,
//       stops: sortedStopDetails
//     });
    
//   } catch (error) {
//     console.error('Error fetching stop times:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

// Get stop times for a specific trip
export const getStopTimesByTripId = async (req, res) => {
    const { tripId } = req.params;
  
    try {
      const stopTimeKey = `stop_time:${tripId}`;
      const stopTimes = await client.zRange(stopTimeKey, 0, -1, { withScores: true });
  
      if (stopTimes.length === 0) {
        return res.status(404).json({ error: 'No stop times found for this trip' });
      }
  
      // Convert the stop time data from the sorted set
      const sortedStopDetails = stopTimes.map((stopTimeData, index) => {
        const stopTime = JSON.parse(stopTimeData);
        return {
          ...stopTime,
          stop_sequence: parseInt(stopTimes[index + 1]) // Get the score (stop_sequence)
        };
      });
  
      // Get trip and route details
      // (Your existing implementation for getting trip and route details)
  
      res.json({
        trip_id: tripId,
        route_id: trip.route_id,
        route_name: route.route_long_name || route.route_short_name,
        stops: sortedStopDetails
      });
    } catch (error) {
      console.error('Error fetching stop times:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
// Get complete schedule for a route
export const getRouteSchedule = async (req, res) => {
  const { routeId } = req.params;
  
  try {
    // Get route details
    const route = await client.hGetAll(`route:${routeId}`);
    
    if (Object.keys(route).length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Get all trips for this route
    const tripKeys = await client.keys(`trip:*`);
    const trips = await Promise.all(tripKeys.map(key => client.hGetAll(key)));
    const routeTrips = trips.filter(trip => trip.route_id === routeId);
    
    // Get schedule for each trip
    const tripSchedules = await Promise.all(
      routeTrips.map(async (trip) => {
        const stopTimeKeys = await client.keys(`stop_time:${trip.trip_id}_*`);
        const stopTimes = await Promise.all(stopTimeKeys.map(key => client.hGetAll(key)));
        
        // Get stop details for each stop time
        const stopDetails = await Promise.all(
          stopTimes.map(async (stopTime) => {
            const stop = await client.hGetAll(`stop:${stopTime.stop_id}`);
            return {
              ...stopTime,
              stop_name: stop.stop_name,
              stop_lat: stop.stop_lat,
              stop_lon: stop.stop_lon
            };
          })
        );
        
        return {
          trip_id: trip.trip_id,
          service_id: trip.service_id,
          stops: stopDetails.sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence))
        };
      })
    );
    
    res.json({
      route_id: routeId,
      route_name: route.route_long_name || route.route_short_name,
      route_type: route.route_type,
      trip_count: tripSchedules.length,
      trips: tripSchedules
    });
    
  } catch (error) {
    console.error('Error fetching route schedule:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};