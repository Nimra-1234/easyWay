// import client from '../config/redisClient.js';

// export const getAllStops = async (req, res) => {
//   const keys = await client.keys('stop:*');
//   const routes = await Promise.all(keys.map(key => client.hGetAll(key)));
//   res.json(routes);
// };

// export const getStopById = async (req, res) => {
//   const route = await client.hGetAll(`stop:${req.params.id}`);
//   res.json(route);
// };

// stopController.js
import client from '../config/redisClient.js';

// Get all stops
export const getAllStops = async (req, res) => {
  try {
    const keys = await client.keys('stop:*');
    const stops = await Promise.all(keys.map(key => client.hGetAll(key)));
    
    // Filter out empty objects and sort by stop_sequence if available
    const validStops = stops
      .filter(stop => Object.keys(stop).length > 0)
      .sort((a, b) => (a.stop_sequence || 0) - (b.stop_sequence || 0));

    res.json(validStops);
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get stop by ID
export const getStopById = async (req, res) => {
  try {
    const stop = await client.hGetAll(`stop:${req.params.id}`);
    
    if (Object.keys(stop).length === 0) {
      return res.status(404).json({ error: 'Stop not found' });
    }
    
    res.json(stop);
  } catch (error) {
    console.error('Error fetching stop:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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